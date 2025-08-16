'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import ScheduleModal from '@/components/modals/ScheduleModal'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<any[]>([])
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchSchedules()
    
    const channel = supabase
      .channel('schedules-page')
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
  }, [currentWeek])

  const fetchSchedules = async () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 })
    const weekEnd = addDays(weekStart, 7)
    
    const { data } = await supabase
      .from('schedules')
      .select('*')
      .gte('start_time', weekStart.toISOString())
      .lt('start_time', weekEnd.toISOString())
      .order('start_time', { ascending: true })
    
    setSchedules(data || [])
  }

  const getSchedulePosition = (schedule: any) => {
    const startTime = new Date(schedule.start_time)
    const endTime = new Date(schedule.end_time)
    const dayIndex = startTime.getDay()
    const startHour = startTime.getHours() + startTime.getMinutes() / 60
    const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
    
    return {
      left: `${(dayIndex * 100) / 7}%`,
      top: `${startHour * 60}px`,
      height: `${duration * 60}px`,
      width: `${100 / 7}%`,
    }
  }

  const handleScheduleClick = (schedule: any) => {
    setSelectedSchedule(schedule)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setSelectedSchedule(null)
    fetchSchedules()
  }

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 })

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">시간표</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="text-sm font-medium">
                {format(weekStart, 'yyyy년 MM월 d일', { locale: ko })} - 
                {format(addDays(weekStart, 6), ' MM월 d일', { locale: ko })}
              </span>
              <button
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <button
              onClick={() => setCurrentWeek(new Date())}
              className="px-3 py-1 text-sm bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100"
            >
              오늘
            </button>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            <span>일정 추가</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex">
        {/* Time labels */}
        <div className="w-16 flex-shrink-0">
          <div className="h-12 border-b border-gray-200"></div>
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="h-[60px] border-b border-gray-100 px-2 py-1 text-xs text-gray-500"
            >
              {hour.toString().padStart(2, '0')}:00
            </div>
          ))}
        </div>

        {/* Calendar */}
        <div className="flex-1 relative">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {DAYS.map((day, index) => {
              const date = addDays(weekStart, index)
              const isToday = isSameDay(date, new Date())
              
              return (
                <div
                  key={day}
                  className={`h-12 px-2 py-1 text-center border-l border-gray-200 ${
                    isToday ? 'bg-indigo-50' : ''
                  }`}
                >
                  <div className="text-xs text-gray-500">{day}</div>
                  <div className={`text-sm font-medium ${
                    isToday ? 'text-indigo-600' : 'text-gray-900'
                  }`}>
                    {format(date, 'd')}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Grid */}
          <div className="relative">
            {/* Hour rows */}
            {HOURS.map((hour) => (
              <div key={hour} className="h-[60px] border-b border-gray-100">
                <div className="grid grid-cols-7 h-full">
                  {DAYS.map((_, dayIndex) => (
                    <div
                      key={dayIndex}
                      className="border-l border-gray-200"
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Schedules */}
            {schedules.map((schedule) => {
              const position = getSchedulePosition(schedule)
              
              return (
                <div
                  key={schedule.id}
                  className="absolute p-1 cursor-pointer hover:opacity-90 transition-opacity"
                  style={{
                    ...position,
                    backgroundColor: schedule.color,
                  }}
                  onClick={() => handleScheduleClick(schedule)}
                >
                  <div className="text-white text-xs font-medium p-1">
                    <div className="truncate">{schedule.title}</div>
                    <div className="text-[10px] opacity-90">
                      {format(new Date(schedule.start_time), 'HH:mm')} - 
                      {format(new Date(schedule.end_time), 'HH:mm')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <ScheduleModal
        open={modalOpen}
        onClose={handleModalClose}
        schedule={selectedSchedule}
      />
    </div>
  )
}