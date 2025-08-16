'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, startOfWeek, addDays, isSameDay, addWeeks, subWeeks, 
         setHours, setMinutes, addMonths, subMonths, startOfMonth, 
         endOfMonth, eachDayOfInterval, isWithinInterval, parseISO,
         isSameMonth, isSameWeek } from 'date-fns'
import { ko } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Trash2, Edit, X, Calendar, Clock, Repeat } from 'lucide-react'
import ScheduleModal from '@/components/modals/ScheduleModal'
import toast from 'react-hot-toast'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const DAYS = ['일', '월', '화', '수', '목', '금', '토']

export default function SchedulePage() {
  const [schedules, setSchedules] = useState<any[]>([])
  const [recurringSchedules, setRecurringSchedules] = useState<any[]>([])
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState<{ day: number; hour: number; minutes: number } | null>(null)
  const [dragEnd, setDragEnd] = useState<{ day: number; hour: number; minutes: number } | null>(null)
  const [modalInitialDate, setModalInitialDate] = useState<Date | undefined>()
  const [modalInitialStartTime, setModalInitialStartTime] = useState<string | undefined>()
  const [modalInitialEndTime, setModalInitialEndTime] = useState<string | undefined>()
  const [hoveredSchedule, setHoveredSchedule] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [recurringDeleteModal, setRecurringDeleteModal] = useState<{ 
    open: boolean; 
    scheduleId: string | null;
    instanceDate?: string; // Date of the specific instance to delete
  }>({ open: false, scheduleId: null })
  const [resizingSchedule, setResizingSchedule] = useState<{ id: string; type: 'top' | 'bottom' } | null>(null)
  const [resizeStartY, setResizeStartY] = useState<number>(0)
  const gridRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
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

    // Auto-scroll to current time on mount
    if (scrollContainerRef.current && isSameWeek(new Date(), currentWeek, { weekStartsOn: 0 })) {
      const currentHour = new Date().getHours()
      const scrollPosition = Math.max(0, (currentHour - 2) * 60) // Show 2 hours before current time
      scrollContainerRef.current.scrollTop = scrollPosition
    }

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentWeek])

  const fetchSchedules = async () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 })
    const weekEnd = addDays(weekStart, 7)
    
    // Fetch all schedules including recurring ones
    const { data } = await supabase
      .from('schedules')
      .select('*')
      .order('start_time', { ascending: true })
    
    if (!data) return
    
    // Filter and expand recurring schedules
    const allSchedules: any[] = []
    const recurring: any[] = []
    
    data.forEach(schedule => {
      const startTime = new Date(schedule.start_time)
      
      if (schedule.recurrence && schedule.recurrence !== 'none') {
        recurring.push(schedule)
        // Generate recurring instances for current week
        const instances = generateRecurringInstances(schedule, weekStart, weekEnd)
        allSchedules.push(...instances)
      } else if (isWithinInterval(startTime, { start: weekStart, end: weekEnd })) {
        allSchedules.push(schedule)
      }
    })
    
    setSchedules(allSchedules)
    setRecurringSchedules(recurring)
  }

  const generateRecurringInstances = (schedule: any, weekStart: Date, weekEnd: Date) => {
    const instances: any[] = []
    const startTime = new Date(schedule.start_time)
    const endTime = new Date(schedule.end_time)
    const duration = endTime.getTime() - startTime.getTime()
    
    // Parse excluded dates if they exist
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
    const endDate = schedule.recurrence_end ? new Date(schedule.recurrence_end) : null
    
    let currentDate = new Date(startTime)
    const maxIterations = 365 // Prevent infinite loops
    let iterations = 0
    
    while (currentDate < weekEnd && iterations < maxIterations) {
      // Skip if this date is excluded or past the recurrence end date
      const dateStr = currentDate.toISOString().split('T')[0]
      const isExcluded = excludedDates.includes(dateStr)
      const isPastEndDate = endDate && currentDate > endDate
      
      if (currentDate >= weekStart && currentDate < weekEnd && !isExcluded && !isPastEndDate) {
        instances.push({
          ...schedule,
          id: `${schedule.id}_${currentDate.getTime()}`,
          start_time: currentDate.toISOString(),
          end_time: new Date(currentDate.getTime() + duration).toISOString(),
          is_recurring_instance: true,
          original_id: schedule.id,
          instance_date: dateStr
        })
      }
      
      // Move to next occurrence
      switch (schedule.recurrence) {
        case 'daily':
          currentDate = addDays(currentDate, 1)
          break
        case 'weekdays':
          // Skip to next weekday
          do {
            currentDate = addDays(currentDate, 1)
          } while (currentDate.getDay() === 0 || currentDate.getDay() === 6)
          break
        case 'weekends':
          // Skip to next weekend day
          do {
            currentDate = addDays(currentDate, 1)
          } while (currentDate.getDay() !== 0 && currentDate.getDay() !== 6)
          break
        case 'weekly':
          currentDate = addDays(currentDate, 7)
          break
        case 'monthly':
          currentDate = addMonths(currentDate, 1)
          break
        case 'yearly':
          currentDate = addMonths(currentDate, 12)
          break
        default:
          return instances
      }
      iterations++
    }
    
    return instances
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
      height: `${Math.max(duration * 60, 20)}px`, // Minimum height for visibility
      width: `calc(${100 / 7}% - 4px)`, // Slight margin
    }
  }

  const handleScheduleClick = (schedule: any) => {
    // If it's a recurring instance, load the original schedule
    if (schedule.is_recurring_instance) {
      const original = recurringSchedules.find(s => s.id === schedule.original_id)
      if (original) {
        setSelectedSchedule(original)
      }
    } else {
      setSelectedSchedule(schedule)
    }
    setModalOpen(true)
  }

  const handleDeleteSchedule = async (scheduleId: string) => {
    // Check if it's a recurring instance
    const schedule = schedules.find(s => s.id === scheduleId)
    
    if (schedule?.is_recurring_instance) {
      // Show modal for recurring schedule deletion
      setRecurringDeleteModal({ open: true, scheduleId: schedule.original_id, instanceDate: schedule.instance_date })
    } else {
      // Show confirmation for non-recurring
      setDeleteConfirm(scheduleId)
    }
  }

  const confirmDelete = async () => {
    if (!deleteConfirm) return
    
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', deleteConfirm)
    
    if (error) {
      toast.error('일정 삭제 실패')
    } else {
      toast.success('일정이 삭제되었습니다', { icon: '🗑️' })
      fetchSchedules()
    }
    setDeleteConfirm(null)
  }

  const handleDeleteRecurring = async (deleteType: 'single' | 'future' | 'all') => {
    if (!recurringDeleteModal.scheduleId) return
    
    if (deleteType === 'all') {
      // Delete all occurrences
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', recurringDeleteModal.scheduleId)
      
      if (error) {
        toast.error('일정 삭제 실패')
      } else {
        toast.success('모든 반복 일정이 삭제되었습니다', { icon: '🗑️' })
        setRecurringDeleteModal({ open: false, scheduleId: null })
        setDeleteConfirm(null)
        fetchSchedules()
      }
    } else if (deleteType === 'single' && recurringDeleteModal.instanceDate) {
      // Delete only this instance by adding to excluded dates
      const { data: schedule } = await supabase
        .from('schedules')
        .select('excluded_dates')
        .eq('id', recurringDeleteModal.scheduleId)
        .single()
      
      let excludedDates = []
      try {
        if (schedule?.excluded_dates) {
          excludedDates = typeof schedule.excluded_dates === 'string' 
            ? JSON.parse(schedule.excluded_dates) 
            : schedule.excluded_dates
        }
      } catch (e) {
        excludedDates = []
      }
      excludedDates.push(recurringDeleteModal.instanceDate)
      
      const { error } = await supabase
        .from('schedules')
        .update({ excluded_dates: JSON.stringify(excludedDates) })
        .eq('id', recurringDeleteModal.scheduleId)
      
      if (error) {
        toast.error('일정 삭제 실패')
      } else {
        toast.success('선택한 일정이 삭제되었습니다', { icon: '🗑️' })
        setRecurringDeleteModal({ open: false, scheduleId: null })
        fetchSchedules()
      }
    } else if (deleteType === 'future' && recurringDeleteModal.instanceDate) {
      // Delete future occurrences by setting recurrence_end
      const endDate = new Date(recurringDeleteModal.instanceDate)
      endDate.setDate(endDate.getDate() - 1) // End recurrence the day before
      
      const { error } = await supabase
        .from('schedules')
        .update({ recurrence_end: endDate.toISOString() })
        .eq('id', recurringDeleteModal.scheduleId)
      
      if (error) {
        toast.error('일정 삭제 실패')
      } else {
        toast.success('미래의 반복 일정이 삭제되었습니다', { icon: '🗑️' })
        setRecurringDeleteModal({ open: false, scheduleId: null })
        fetchSchedules()
      }
    }
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setSelectedSchedule(null)
    setModalInitialDate(undefined)
    setModalInitialStartTime(undefined)
    setModalInitialEndTime(undefined)
    // fetchSchedules will be called automatically by realtime subscription
  }
  
  const handleModalSuccess = () => {
    fetchSchedules() // Immediately fetch after successful save
  }

  const getCellPosition = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gridRef.current) return null
    
    const rect = gridRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    const cellWidth = rect.width / 7
    const cellHeight = 60
    
    const day = Math.floor(x / cellWidth)
    const hourFloat = y / cellHeight
    const hour = Math.floor(hourFloat)
    const minutes = Math.round((hourFloat - hour) * 60 / 15) * 15 // Round to 15 min intervals
    
    return { 
      day: Math.max(0, Math.min(6, day)), 
      hour: Math.max(0, Math.min(23, hour)),
      minutes: Math.min(45, minutes)
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Don't start drag if clicking on a schedule
    if ((e.target as HTMLElement).closest('.schedule-item')) return
    
    const position = getCellPosition(e)
    if (!position) return
    
    setIsDragging(true)
    setDragStart(position)
    setDragEnd(position)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStart) return
    
    const position = getCellPosition(e)
    if (!position) return
    
    setDragEnd(position)
  }

  const handleResizeStart = (e: React.MouseEvent, scheduleId: string, type: 'top' | 'bottom') => {
    e.preventDefault()
    e.stopPropagation()
    setResizingSchedule({ id: scheduleId, type })
    setResizeStartY(e.clientY)
  }

  const handleResizeMove = async (e: React.MouseEvent) => {
    if (!resizingSchedule || !gridRef.current) return
    
    const schedule = schedules.find(s => s.id === resizingSchedule.id)
    if (!schedule) return
    
    const deltaY = e.clientY - resizeStartY
    const hourDelta = deltaY / 60 // 60px per hour
    
    const startTime = new Date(schedule.start_time)
    const endTime = new Date(schedule.end_time)
    
    if (resizingSchedule.type === 'top') {
      // Adjust start time
      const newStartTime = new Date(startTime.getTime() + hourDelta * 60 * 60 * 1000)
      if (newStartTime < endTime) {
        await supabase
          .from('schedules')
          .update({ start_time: newStartTime.toISOString() })
          .eq('id', schedule.is_recurring_instance ? schedule.original_id : schedule.id)
      }
    } else {
      // Adjust end time
      const newEndTime = new Date(endTime.getTime() + hourDelta * 60 * 60 * 1000)
      if (newEndTime > startTime) {
        await supabase
          .from('schedules')
          .update({ end_time: newEndTime.toISOString() })
          .eq('id', schedule.is_recurring_instance ? schedule.original_id : schedule.id)
      }
    }
    
    setResizeStartY(e.clientY)
  }

  const handleResizeEnd = () => {
    setResizingSchedule(null)
    fetchSchedules()
  }

  const handleMouseUp = () => {
    if (resizingSchedule) {
      handleResizeEnd()
      return
    }
    if (!isDragging || !dragStart || !dragEnd) {
      setIsDragging(false)
      setDragStart(null)
      setDragEnd(null)
      return
    }
    
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 })
    const startDate = addDays(weekStart, dragStart.day)
    const endDate = addDays(weekStart, dragEnd.day)
    
    // Ensure start is before end
    const startHour = Math.min(dragStart.hour, dragEnd.hour)
    const endHour = Math.max(dragStart.hour, dragEnd.hour)
    const startMinutes = dragStart.hour < dragEnd.hour ? dragStart.minutes : dragEnd.minutes
    const endMinutes = dragStart.hour < dragEnd.hour ? dragEnd.minutes : dragStart.minutes
    
    // If same hour, ensure at least 30 minutes duration
    const finalEndHour = startHour === endHour ? endHour + 1 : endHour
    const finalEndMinutes = startHour === endHour ? 0 : endMinutes
    
    setModalInitialDate(startDate)
    setModalInitialStartTime(`${String(startHour).padStart(2, '0')}:${String(startMinutes).padStart(2, '0')}`)
    setModalInitialEndTime(`${String(finalEndHour).padStart(2, '0')}:${String(finalEndMinutes).padStart(2, '0')}`)
    setModalOpen(true)
    
    setIsDragging(false)
    setDragStart(null)
    setDragEnd(null)
  }

  const getDragSelectionStyle = () => {
    if (!isDragging || !dragStart || !dragEnd) return null
    
    const minDay = Math.min(dragStart.day, dragEnd.day)
    const maxDay = Math.max(dragStart.day, dragEnd.day)
    const minHour = Math.min(dragStart.hour, dragEnd.hour)
    const maxHour = Math.max(dragStart.hour, dragEnd.hour)
    const minMinutes = dragStart.hour < dragEnd.hour ? dragStart.minutes : dragEnd.minutes
    const maxMinutes = dragStart.hour < dragEnd.hour ? dragEnd.minutes : dragStart.minutes
    
    const duration = maxHour - minHour + (maxMinutes - minMinutes) / 60
    const finalDuration = Math.max(0.5, duration) // Minimum 30 minutes
    
    return {
      left: `${(minDay * 100) / 7}%`,
      top: `${minHour * 60 + minMinutes}px`,
      width: `calc(${((maxDay - minDay + 1) * 100) / 7}% - 4px)`,
      height: `${finalDuration * 60}px`,
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
      border: '2px dashed #6366F1',
      borderRadius: '8px',
      pointerEvents: 'none' as const,
      zIndex: 100,
    }
  }

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 })

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">시간표</h1>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 min-w-[200px] text-center">
                {format(weekStart, 'yyyy년 MM월 d일', { locale: ko })} - 
                {format(addDays(weekStart, 6), ' MM월 d일', { locale: ko })}
              </span>
              <button
                onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}
                className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            <button
              onClick={() => setCurrentWeek(new Date())}
              className="px-3 py-1.5 text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors font-medium"
            >
              오늘
            </button>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>일정 추가</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div ref={scrollContainerRef} className="flex flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex flex-1">
          {/* Time labels */}
          <div className="w-16 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="h-12 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10"></div>
            <div>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="h-[60px] border-b border-gray-100 dark:border-gray-700/50 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 text-right"
                >
                  {hour === 0 ? '자정' : hour === 12 ? '정오' : `${hour.toString().padStart(2, '0')}:00`}
                </div>
              ))}
            </div>
          </div>

          {/* Calendar */}
          <div className="flex-1 relative">
          {/* Day headers - Sticky */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
            {DAYS.map((day, index) => {
              const date = addDays(weekStart, index)
              const isToday = isSameDay(date, new Date())
              
              return (
                <div
                  key={day}
                  className={`h-12 px-2 py-1 text-center border-l border-gray-200 dark:border-gray-700 ${
                    isToday ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                  }`}
                >
                  <div className="text-xs text-gray-500 dark:text-gray-400">{day}</div>
                  <div className={`text-sm font-medium ${
                    isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-gray-100'
                  }`}>
                    {format(date, 'd')}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Grid */}
          <div 
            ref={gridRef}
            className="relative select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={(e) => {
              if (resizingSchedule) {
                handleResizeMove(e)
              } else {
                handleMouseMove(e)
              }
            }}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: isDragging ? 'crosshair' : resizingSchedule ? 'ns-resize' : 'default' }}
          >
            {/* Hour rows */}
            {HOURS.map((hour) => (
              <div key={hour} className="h-[60px] border-b border-gray-100 dark:border-gray-700/50">
                <div className="grid grid-cols-7 h-full">
                  {DAYS.map((_, dayIndex) => {
                    const date = addDays(weekStart, dayIndex)
                    const isToday = isSameDay(date, new Date())
                    const isCurrentHour = isToday && new Date().getHours() === hour
                    
                    return (
                      <div
                        key={dayIndex}
                        className={`border-l border-gray-200 dark:border-gray-700 transition-colors ${
                          isCurrentHour ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                        }`}
                      />
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Current time indicator */}
            {isSameWeek(new Date(), currentWeek, { weekStartsOn: 0 }) && (
              <div
                className="absolute w-full border-t-2 border-red-500 z-50 pointer-events-none"
                style={{
                  top: `${(new Date().getHours() + new Date().getMinutes() / 60) * 60}px`,
                }}
              >
                <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full"></div>
              </div>
            )}

            {/* Drag selection preview */}
            {isDragging && (
              <div 
                className="absolute"
                style={getDragSelectionStyle() || {}}
              />
            )}

            {/* Schedules */}
            {schedules.map((schedule) => {
              const position = getSchedulePosition(schedule)
              const isHovered = hoveredSchedule === schedule.id
              const isDeleting = deleteConfirm === schedule.id
              
              return (
                <div
                  key={schedule.id}
                  className="schedule-item absolute rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-all group"
                  style={{
                    ...position,
                    backgroundColor: schedule.color || '#6366F1',
                    opacity: isDeleting ? 0.5 : isHovered ? 0.95 : 1,
                    transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                    zIndex: isHovered ? 60 : 50,
                  }}
                  onMouseEnter={() => setHoveredSchedule(schedule.id)}
                  onMouseLeave={() => setHoveredSchedule(null)}
                  onClick={() => !isDeleting && handleScheduleClick(schedule)}
                >
                  <div className="p-1.5 h-full flex flex-col relative">
                    {/* Resize Handles */}
                    {!schedule.is_recurring_instance && (
                      <>
                        <div
                          className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/20 hover:bg-white/40 transition-all"
                          onMouseDown={(e) => handleResizeStart(e, schedule.id, 'top')}
                        />
                        <div
                          className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white/20 hover:bg-white/40 transition-all"
                          onMouseDown={(e) => handleResizeStart(e, schedule.id, 'bottom')}
                        />
                      </>
                    )}
                    {/* Actions */}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleScheduleClick(schedule)
                        }}
                        className="p-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
                      >
                        <Edit className="h-3 w-3 text-white" />
                      </button>
                      {!schedule.is_recurring_instance ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteSchedule(schedule.id)
                          }}
                          className="p-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
                        >
                          <Trash2 className="h-3 w-3 text-white" />
                        </button>
                      ) : (
                        // 반복 일정 인스턴스의 경우에도 삭제 버튼 표시
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // 반복 일정 인스턴스일 때 바로 모달 열기
                            if (schedule.is_recurring_instance) {
                              setRecurringDeleteModal({ 
                                open: true, 
                                scheduleId: schedule.original_id,
                                instanceDate: schedule.instance_date
                              })
                            } else {
                              setDeleteConfirm(schedule.id)
                            }
                          }}
                          className="p-1 bg-white/20 hover:bg-white/30 rounded transition-colors"
                        >
                          <Trash2 className="h-3 w-3 text-white" />
                        </button>
                      )}
                    </div>
                    
                    {/* Content */}
                    <div className="text-white">
                      <div className="text-xs font-medium truncate flex items-center">
                        {schedule.title}
                        {schedule.recurrence && schedule.recurrence !== 'none' && (
                          <Repeat className="h-3 w-3 ml-1 inline-block" />
                        )}
                      </div>
                      <div className="text-[10px] opacity-90 flex items-center mt-0.5">
                        <Clock className="h-2.5 w-2.5 mr-0.5" />
                        {format(new Date(schedule.start_time), 'HH:mm')} - 
                        {format(new Date(schedule.end_time), 'HH:mm')}
                      </div>
                      {schedule.description && position.height > '40px' && (
                        <div className="text-[10px] opacity-80 mt-0.5 truncate">
                          {schedule.description}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          </div>
        </div>
      </div>

      <ScheduleModal
        open={modalOpen}
        onClose={handleModalClose}
        schedule={selectedSchedule}
        initialDate={modalInitialDate}
        initialStartTime={modalInitialStartTime}
        initialEndTime={modalInitialEndTime}
        onSuccess={handleModalSuccess}
      />

      {/* Regular Schedule Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              일정 삭제
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              이 일정을 삭제하시겠습니까?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recurring Delete Modal */}
      {recurringDeleteModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setRecurringDeleteModal({ open: false, scheduleId: null })} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center">
              <Repeat className="h-5 w-5 mr-2 text-indigo-500" />
              반복 일정 삭제
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              이 일정은 반복되는 일정입니다.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
              어떤 일정을 삭제하시겠습니까?
            </p>
            
            <div className="space-y-3 mb-6">
              <button
                onClick={() => handleDeleteRecurring('single')}
                className="w-full p-4 text-left border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">이 이벤트만 삭제</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">선택한 날짜의 일정만 삭제합니다</p>
                  </div>
                  <Calendar className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                </div>
              </button>
              
              <button
                onClick={() => handleDeleteRecurring('future')}
                className="w-full p-4 text-left border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">앞으로 모든 이벤트 삭제</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">오늘 이후의 모든 반복 일정을 삭제합니다</p>
                  </div>
                  <Clock className="h-5 w-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
                </div>
              </button>
              
              <button
                onClick={() => handleDeleteRecurring('all')}
                className="w-full p-4 text-left border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-700 dark:text-red-400">모든 이벤트 삭제</p>
                    <p className="text-sm text-red-600 dark:text-red-500 mt-1">과거와 미래의 모든 반복 일정을 삭제합니다</p>
                  </div>
                  <Trash2 className="h-5 w-5 text-red-500 group-hover:text-red-600" />
                </div>
              </button>
            </div>
            
            <button
              onClick={() => setRecurringDeleteModal({ open: false, scheduleId: null })}
              className="w-full px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}