'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, GripVertical, Repeat, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format, isToday, isTomorrow, addDays, addMonths, isWithinInterval } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cardStyles, headerStyles, listItemStyles, emptyStateStyles, badgeStyles, textStyles } from '@/lib/constants/styles'

export default function ScheduleWidget({ initialSchedules }: { initialSchedules: any[] }) {
  const [schedules, setSchedules] = useState<any[]>([])
  const supabase = createClient()

  // Generate recurring instances for today
  const generateTodayRecurringInstances = (schedule: any) => {
    const instances: any[] = []
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    
    const originalStart = new Date(schedule.start_time)
    const originalEnd = new Date(schedule.end_time)
    const duration = originalEnd.getTime() - originalStart.getTime()
    
    // Parse excluded dates and recurrence end
    let excludedDates = []
    try {
      if (schedule.excluded_dates) {
        excludedDates = typeof schedule.excluded_dates === 'string' 
          ? JSON.parse(schedule.excluded_dates) 
          : schedule.excluded_dates
      }
    } catch (e) {
      excludedDates = []
    }
    const recurrenceEnd = schedule.recurrence_end ? new Date(schedule.recurrence_end) : null
    
    // Create today's instance with the same time as original
    const todayInstance = new Date(todayStart)
    todayInstance.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0)
    
    // Check if today is excluded or past recurrence end
    const todayStr = todayStart.toISOString().split('T')[0]
    if (excludedDates.includes(todayStr)) {
      return instances
    }
    
    if (recurrenceEnd && todayStart > recurrenceEnd) {
      return instances
    }
    
    // Check if we've started the recurrence yet
    const scheduleStartDate = new Date(originalStart)
    scheduleStartDate.setHours(0, 0, 0, 0)
    if (todayStart < scheduleStartDate) {
      return instances
    }
    
    // Check if the schedule should occur today based on recurrence type
    const shouldOccurToday = () => {
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
          return today.getMonth() === originalStart.getMonth() && dayOfMonth === originalStart.getDate()
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
  }

  const processSchedules = (scheduleData: any[]) => {
    const allSchedules: any[] = []
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)
    
    scheduleData.forEach(schedule => {
      const startTime = new Date(schedule.start_time)
      
      if (schedule.recurrence && schedule.recurrence !== 'none') {
        const instances = generateTodayRecurringInstances(schedule)
        allSchedules.push(...instances)
      } else if (isWithinInterval(startTime, { start: todayStart, end: todayEnd })) {
        // Only show today's non-recurring schedules
        allSchedules.push(schedule)
      }
    })
    
    return allSchedules.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )
  }

  useEffect(() => {
    // Process initial schedules to include recurring instances
    const processed = processSchedules(initialSchedules || [])
    setSchedules(processed)
  }, [initialSchedules])

  useEffect(() => {
    const fetchAndProcessSchedules = async () => {
      const { data } = await supabase
        .from('schedules')
        .select('*')
        .order('start_time', { ascending: true })
      
      if (data) {
        const processed = processSchedules(data)
        setSchedules(processed)
      }
    }
    
    // Fetch schedules immediately
    fetchAndProcessSchedules()
    
    const channel = supabase
      .channel('schedules-widget-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
        },
        () => {
          // Refetch all schedules on any change
          fetchAndProcessSchedules()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const getDateLabel = (date: Date) => {
    if (isToday(date)) return '오늘'
    if (isTomorrow(date)) return '내일'
    return format(date, 'MM월 dd일', { locale: ko })
  }

  const handleDragStart = (e: React.DragEvent, schedule: any) => {
    e.dataTransfer.setData('schedule', JSON.stringify(schedule))
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div className={cardStyles.full}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={headerStyles.widget}>오늘 예정된 일정</h2>
        <div className={`flex items-center ${textStyles.small}`}>
          <Calendar className="h-4 w-4 mr-1" />
          <span>{format(new Date(), 'MM월 dd일', { locale: ko })}</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {schedules.length === 0 ? (
          <div className={emptyStateStyles.container}>
            <div className={emptyStateStyles.icon.replace('from-indigo-100 to-purple-100', 'from-purple-100 to-pink-100').replace('from-indigo-900/20 to-purple-900/20', 'from-purple-900/20 to-pink-900/20')}>
              <CalendarDays className={`${emptyStateStyles.iconSize} text-purple-500 dark:text-purple-400`} />
            </div>
            <p className={emptyStateStyles.title}>오늘 일정이 없습니다</p>
            <p className={emptyStateStyles.description}>새로운 일정을 추가해보세요!</p>
          </div>
        ) : (
          schedules.map((schedule) => {
            const startTime = new Date(schedule.start_time)
            const endTime = new Date(schedule.end_time)
            
            return (
              <div
                key={schedule.id}
                draggable
                onDragStart={(e) => handleDragStart(e, schedule)}
                className={`${listItemStyles.base} cursor-move`}
              >
                <GripVertical className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div
                  className="w-1 h-full rounded-full flex-shrink-0"
                  style={{ backgroundColor: schedule.color }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {schedule.title}
                    </p>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {format(startTime, 'HH:mm')}
                    </span>
                  </div>
                  <div className="flex items-center mt-1 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>
                      {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                    </span>
                    <span className="mx-1">•</span>
                    <span>{Math.round((endTime.getTime() - startTime.getTime()) / 60000)}분</span>
                  </div>
                  {schedule.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{schedule.description}</p>
                  )}
                  {(schedule.recurrence && schedule.recurrence !== 'none') || schedule.is_recurring_instance ? (
                    <span className={`${badgeStyles.default} ${badgeStyles.indigo} mt-2`}>
                      <Repeat className="h-3 w-3 mr-1" />
                      {schedule.recurrence === 'daily' && '매일'}
                      {schedule.recurrence === 'weekdays' && '평일'}
                      {schedule.recurrence === 'weekends' && '주말'}
                      {schedule.recurrence === 'weekly' && '매주'}
                      {schedule.recurrence === 'monthly' && '매월'}
                      {schedule.recurrence === 'yearly' && '매년'}
                      {schedule.is_recurring_instance && '반복'}
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}