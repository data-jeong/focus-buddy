'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format, isToday, isTomorrow } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function ScheduleWidget({ initialSchedules }: { initialSchedules: any[] }) {
  const [schedules, setSchedules] = useState(initialSchedules)
  const supabase = createClient()

  useEffect(() => {
    const channel = supabase
      .channel('schedules-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setSchedules(prev => [...prev, payload.new as any].sort((a, b) => 
              new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
            ))
          } else if (payload.eventType === 'UPDATE') {
            setSchedules(prev => prev.map(schedule => 
              schedule.id === payload.new.id ? payload.new as any : schedule
            ))
          } else if (payload.eventType === 'DELETE') {
            setSchedules(prev => prev.filter(schedule => schedule.id !== payload.old.id))
          }
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">예정된 일정</h2>
        <Calendar className="h-5 w-5 text-gray-400" />
      </div>
      
      <div className="space-y-3">
        {schedules.length === 0 ? (
          <p className="text-gray-500 text-center py-8">예정된 일정이 없습니다</p>
        ) : (
          schedules.map((schedule) => {
            const startTime = new Date(schedule.start_time)
            const endTime = new Date(schedule.end_time)
            
            return (
              <div
                key={schedule.id}
                className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div
                  className="w-1 h-full rounded-full flex-shrink-0"
                  style={{ backgroundColor: schedule.color }}
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    {schedule.title}
                  </p>
                  <div className="flex items-center mt-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{getDateLabel(startTime)}</span>
                    <span className="mx-1">•</span>
                    <span>
                      {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')}
                    </span>
                  </div>
                  {schedule.description && (
                    <p className="text-xs text-gray-600 mt-1">{schedule.description}</p>
                  )}
                </div>
                {schedule.google_event_id && (
                  <div className="flex-shrink-0">
                    <img src="/google-calendar-icon.svg" alt="Google Calendar" className="h-4 w-4" />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}