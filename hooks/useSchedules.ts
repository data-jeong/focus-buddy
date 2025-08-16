'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Schedule } from '@/types/todo'
import { isWithinInterval, isToday } from 'date-fns'
import { ErrorHandler } from '@/lib/utils/error-handler'

interface UseSchedulesOptions {
  autoRefresh?: boolean
  onlyToday?: boolean
}

export function useSchedules(
  initialSchedules: Schedule[] = [], 
  options: UseSchedulesOptions = {}
) {
  const { autoRefresh = true, onlyToday = false } = options
  const [schedules, setSchedules] = useState<Schedule[]>(initialSchedules)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const supabase = useMemo(() => createClient(), [])

  const generateTodayRecurringInstances = useCallback((schedule: Schedule): Schedule[] => {
    const instances: Schedule[] = []
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    
    const originalStart = new Date(schedule.start_time)
    const originalEnd = new Date(schedule.end_time)
    const duration = originalEnd.getTime() - originalStart.getTime()
    
    // Parse excluded dates
    let excludedDates: string[] = []
    try {
      if (schedule.excluded_dates) {
        excludedDates = typeof schedule.excluded_dates === 'string' 
          ? JSON.parse(schedule.excluded_dates) 
          : schedule.excluded_dates
      }
    } catch {
      excludedDates = []
    }
    
    const recurrenceEnd = schedule.recurrence_end ? new Date(schedule.recurrence_end) : null
    
    // Create today's instance
    const todayInstance = new Date(todayStart)
    todayInstance.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0)
    
    // Check exclusions and boundaries
    const todayStr = todayStart.toISOString().split('T')[0]
    if (excludedDates.includes(todayStr)) return instances
    if (recurrenceEnd && todayStart > recurrenceEnd) return instances
    
    const scheduleStartDate = new Date(originalStart)
    scheduleStartDate.setHours(0, 0, 0, 0)
    if (todayStart < scheduleStartDate) return instances
    
    // Check recurrence pattern
    const shouldOccurToday = (): boolean => {
      const today = new Date()
      const dayOfWeek = today.getDay()
      const dayOfMonth = today.getDate()
      
      switch (schedule.recurrence) {
        case 'daily':
          return true
        case 'weekdays':
          return dayOfWeek >= 1 && dayOfWeek <= 5
        case 'weekends':
          return dayOfWeek === 0 || dayOfWeek === 6
        case 'weekly':
          return dayOfWeek === originalStart.getDay()
        case 'monthly':
          return dayOfMonth === originalStart.getDate()
        case 'yearly':
          return today.getMonth() === originalStart.getMonth() && 
                 dayOfMonth === originalStart.getDate()
        default:
          return false
      }
    }
    
    if (shouldOccurToday()) {
      instances.push({
        ...schedule,
        id: `${schedule.id}_${todayInstance.getTime()}`,
        start_time: todayInstance.toISOString(),
        end_time: new Date(todayInstance.getTime() + duration).toISOString(),
        is_recurring_instance: true,
        original_id: schedule.id,
        instance_date: todayStr
      })
    }
    
    return instances
  }, [])

  const processSchedules = useCallback((scheduleData: Schedule[]): Schedule[] => {
    const allSchedules: Schedule[] = []
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)
    
    scheduleData.forEach(schedule => {
      const startTime = new Date(schedule.start_time)
      
      if (schedule.recurrence && schedule.recurrence !== 'none') {
        const instances = generateTodayRecurringInstances(schedule)
        allSchedules.push(...instances)
      } else if (!onlyToday || isWithinInterval(startTime, { start: todayStart, end: todayEnd })) {
        allSchedules.push(schedule)
      }
    })
    
    return allSchedules.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )
  }, [generateTodayRecurringInstances, onlyToday])

  const fetchSchedules = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    const result = await ErrorHandler.tryAsync(async () => {
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .order('start_time', { ascending: true })
      
      if (error) throw error
      return data as Schedule[]
    }, '일정을 불러오는데 실패했습니다')
    
    if (result) {
      const processed = processSchedules(result)
      setSchedules(processed)
    }
    
    setLoading(false)
  }, [supabase, processSchedules])

  const addSchedule = useCallback(async (schedule: Partial<Schedule>) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      ErrorHandler.handle(new Error('User not authenticated'), '로그인이 필요합니다')
      return null
    }
    
    return ErrorHandler.tryAsync(async () => {
      const { data, error } = await supabase
        .from('schedules')
        .insert({ ...schedule, user_id: user.id })
        .select()
        .single()
      
      if (error) throw error
      return data as Schedule
    }, '일정 추가에 실패했습니다')
  }, [supabase])

  const updateSchedule = useCallback(async (id: string, updates: Partial<Schedule>) => {
    return ErrorHandler.tryAsync(async () => {
      const { data, error } = await supabase
        .from('schedules')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data as Schedule
    }, '일정 수정에 실패했습니다')
  }, [supabase])

  const deleteSchedule = useCallback(async (id: string) => {
    return ErrorHandler.tryAsync(async () => {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      setSchedules(prev => prev.filter(s => s.id !== id && s.original_id !== id))
    }, '일정 삭제에 실패했습니다')
  }, [supabase])

  // Stats calculation
  const stats = useMemo(() => {
    const today = schedules.filter(s => {
      const startTime = new Date(s.start_time)
      return isToday(startTime)
    })
    
    const upcoming = schedules.filter(s => {
      const startTime = new Date(s.start_time)
      return startTime > new Date()
    })
    
    return {
      total: schedules.length,
      today: today.length,
      upcoming: upcoming.length
    }
  }, [schedules])

  useEffect(() => {
    setSchedules(processSchedules(initialSchedules))
  }, [initialSchedules, processSchedules])

  useEffect(() => {
    if (!autoRefresh) return
    
    fetchSchedules()
    
    const channel = supabase
      .channel('schedules-hook-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
        },
        () => {
          fetchSchedules()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchSchedules, autoRefresh])

  return {
    schedules,
    loading,
    error,
    stats,
    fetchSchedules,
    addSchedule,
    updateSchedule,
    deleteSchedule
  }
}