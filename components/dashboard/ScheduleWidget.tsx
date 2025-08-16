'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, GripVertical, Repeat, CalendarDays } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format, isToday, isTomorrow, addDays, addMonths, isWithinInterval } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function ScheduleWidget({ initialSchedules }: { initialSchedules: any[] }) {
  const [schedules, setSchedules] = useState<any[]>([])
  const supabase = createClient()

  // Generate recurring instances for today
  const generateTodayRecurringInstances = (schedule: any) => {
    const instances: any[] = []
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)
    
    const startTime = new Date(schedule.start_time)
    const endTime = new Date(schedule.end_time)
    const duration = endTime.getTime() - startTime.getTime()
    
    // Start from the original date but adjust to today's date with same time
    let currentDate = new Date(todayStart)
    currentDate.setHours(startTime.getHours(), startTime.getMinutes(), 0, 0)
    
    // Check if the schedule should occur today based on recurrence type
    const shouldOccurToday = () => {
      const today = new Date()
      switch (schedule.recurrence) {
        case 'daily':
          return true
        case 'weekdays':
          return today.getDay() >= 1 && today.getDay() <= 5
        case 'weekends':
          return today.getDay() === 0 || today.getDay() === 6
        case 'weekly':
          return today.getDay() === startTime.getDay()
        case 'monthly':
          return today.getDate() === startTime.getDate()
        case 'yearly':
          return today.getMonth() === startTime.getMonth() && today.getDate() === startTime.getDate()
        default:
          return false
      }
    }
    
    if (shouldOccurToday()) {
      instances.push({
        ...schedule,
        id: `${schedule.id}_${currentDate.getTime()}`,
        start_time: currentDate.toISOString(),
        end_time: new Date(currentDate.getTime() + duration).toISOString(),
        is_recurring_instance: true,
        original_id: schedule.id
      })
    }
    
    return instances
  }

  useEffect(() => {
    // Process initial schedules to include recurring instances
    const allSchedules: any[] = []
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)
    
    initialSchedules.forEach(schedule => {
      const startTime = new Date(schedule.start_time)
      
      if (schedule.recurrence && schedule.recurrence !== 'none') {
        const instances = generateTodayRecurringInstances(schedule)
        allSchedules.push(...instances)
      } else if (isWithinInterval(startTime, { start: todayStart, end: todayEnd })) {
        // Only show today's non-recurring schedules
        allSchedules.push(schedule)
      }
    })
    setSchedules(allSchedules.sort((a, b) => 
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    ))
  }, [initialSchedules])

  useEffect(() => {
    const fetchAndProcessSchedules = async () => {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const todayEnd = new Date()
      todayEnd.setHours(23, 59, 59, 999)
      
      const { data } = await supabase
        .from('schedules')
        .select('*')
        .or(`start_time.gte.${todayStart.toISOString()}.lte.${todayEnd.toISOString()},recurrence.neq.none`)
        .order('start_time', { ascending: true })
      
      if (data) {
        const allSchedules: any[] = []
        
        data.forEach(schedule => {
          const startTime = new Date(schedule.start_time)
          
          if (schedule.recurrence && schedule.recurrence !== 'none') {
            const instances = generateTodayRecurringInstances(schedule)
            allSchedules.push(...instances)
          } else if (isWithinInterval(startTime, { start: todayStart, end: todayEnd })) {
            allSchedules.push(schedule)
          }
        })
        
        setSchedules(allSchedules.sort((a, b) => 
          new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        ))
      }
    }
    
    const channel = supabase
      .channel('schedules-changes')
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
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">오늘 예정된 일정</h2>
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <Calendar className="h-4 w-4 mr-1" />
          <span>{format(new Date(), 'MM월 dd일', { locale: ko })}</span>
        </div>
      </div>
      
      <div className="space-y-3">
        {schedules.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/20 dark:to-pink-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarDays className="h-8 w-8 text-purple-500 dark:text-purple-400" />
            </div>
            <p className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">오늘 일정이 없습니다</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">새로운 일정을 추가해보세요!</p>
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
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-move group"
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
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-400 mt-2">
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