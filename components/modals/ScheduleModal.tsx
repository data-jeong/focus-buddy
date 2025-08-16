'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Calendar, Clock, Repeat, Palette, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { format, parse } from 'date-fns'
import { ko } from 'date-fns/locale'
import { modalStyles, buttonStyles, inputStyles, textStyles } from '@/lib/constants/styles'

interface Schedule {
  id?: string
  title: string
  description?: string
  start_time: string
  end_time: string
  all_day?: boolean
  recurrence?: string
  recurrence_end?: string
  color?: string
  created_at?: string
  updated_at?: string
}

interface ScheduleModalProps {
  open: boolean
  onClose: () => void
  schedule?: Schedule
  initialDate?: Date
  initialStartTime?: string
  initialEndTime?: string
  onSuccess?: () => void // Callback for successful save
}

const COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // yellow
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#14B8A6', // teal
  '#F97316', // orange
]

const RECURRENCE_OPTIONS = [
  { value: 'none', label: '반복 안 함' },
  { value: 'daily', label: '매일' },
  { value: 'weekdays', label: '평일만 (월-금)' },
  { value: 'weekends', label: '주말만 (토-일)' },
  { value: 'weekly', label: '매주' },
  { value: 'monthly', label: '매월' },
  { value: 'yearly', label: '매년' },
]

export default function ScheduleModal({ 
  open, 
  onClose, 
  schedule,
  initialDate,
  initialStartTime,
  initialEndTime,
  onSuccess 
}: ScheduleModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [color, setColor] = useState(COLORS[0])
  const [recurrence, setRecurrence] = useState('none')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  
  // Validate time format and adjust if needed
  const validateTime = (time: string): string => {
    // Remove all non-digit characters except colon
    let cleaned = time.replace(/[^\d:]/g, '')
    
    // If no colon, try to format as HH:MM
    if (!cleaned.includes(':')) {
      if (cleaned.length === 1) {
        cleaned = `0${cleaned}:00`
      } else if (cleaned.length === 2) {
        cleaned = `${cleaned}:00`
      } else if (cleaned.length === 3) {
        cleaned = `0${cleaned[0]}:${cleaned.slice(1)}`
      } else if (cleaned.length >= 4) {
        cleaned = `${cleaned.slice(0, 2)}:${cleaned.slice(2, 4)}`
      }
    }
    
    // Parse and validate
    const parts = cleaned.split(':')
    if (parts.length !== 2) return '00:00'
    
    let hours = parseInt(parts[0]) || 0
    let minutes = parseInt(parts[1]) || 0
    
    // Clamp values
    hours = Math.min(23, Math.max(0, hours))
    minutes = Math.min(59, Math.max(0, minutes))
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }
  
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setStartTime(e.target.value)
  }
  
  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEndTime(e.target.value)
  }
  
  const handleTimeBlur = (type: 'start' | 'end') => {
    if (type === 'start') {
      setStartTime(validateTime(startTime))
    } else {
      setEndTime(validateTime(endTime))
    }
  }

  useEffect(() => {
    if (schedule) {
      setTitle(schedule.title || '')
      setDescription(schedule.description || '')
      const scheduleStart = new Date(schedule.start_time)
      const scheduleEnd = new Date(schedule.end_time)
      setDate(format(scheduleStart, 'yyyy-MM-dd'))
      setStartTime(format(scheduleStart, 'HH:mm'))
      setEndTime(format(scheduleEnd, 'HH:mm'))
      setColor(schedule.color || COLORS[0])
      setRecurrence(schedule.recurrence || 'none')
    } else {
      // Reset form
      setTitle('')
      setDescription('')
      setColor(COLORS[0])
      setRecurrence('none')
      
      // Set initial times if provided
      if (initialDate) {
        setDate(format(initialDate, 'yyyy-MM-dd'))
      } else {
        setDate(format(new Date(), 'yyyy-MM-dd'))
      }
      
      setStartTime(initialStartTime || '09:00')
      setEndTime(initialEndTime || '10:00')
    }
  }, [schedule, open, initialDate, initialStartTime, initialEndTime])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('제목을 입력해주세요')
      return
    }
    
    if (!date) {
      toast.error('날짜를 선택해주세요')
      return
    }

    // Validate times before submission
    const validatedStartTime = validateTime(startTime)
    const validatedEndTime = validateTime(endTime)
    
    // Combine date and time
    const startDateTime = new Date(`${date}T${validatedStartTime}:00`)
    const endDateTime = new Date(`${date}T${validatedEndTime}:00`)

    if (endDateTime <= startDateTime) {
      toast.error('종료 시간은 시작 시간보다 늦어야 합니다')
      return
    }

    // Check if end time goes past 23:30
    const [endHours, endMinutes] = validatedEndTime.split(':').map(n => parseInt(n))
    if (endHours > 23 || (endHours === 23 && endMinutes > 30)) {
      toast.error('일정은 23:30을 넘길 수 없습니다')
      return
    }

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      toast.error('로그인이 필요합니다')
      setLoading(false)
      return
    }

    const scheduleData = {
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      start_time: startDateTime.toISOString(),
      end_time: endDateTime.toISOString(),
      color,
      recurrence
    }

    if (schedule) {
      // Update existing schedule
      const { error } = await supabase
        .from('schedules')
        .update(scheduleData)
        .eq('id', schedule.id)

      if (error) {
        console.error('Schedule update error:', error)
        toast.error(`일정 수정 실패: ${error.message}`)
      } else {
        toast.success('일정이 수정되었습니다')
        onSuccess?.() // Call success callback if provided
        onClose()
        // Force refresh to update dashboard
        window.location.reload()
      }
    } else {
      // Create new schedule
      const { error } = await supabase
        .from('schedules')
        .insert([scheduleData])

      if (error) {
        console.error('Schedule creation error:', error)
        toast.error(`일정 추가 실패: ${error.message}`)
      } else {
        toast.success('일정이 추가되었습니다')
        onSuccess?.() // Call success callback if provided
        onClose()
        // Force refresh to update dashboard
        window.location.reload()
      }
    }
    
    setLoading(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className={modalStyles.overlay} />
        <Dialog.Content className={`${modalStyles.content} max-h-[90vh] overflow-y-auto`}>
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {schedule ? '일정 수정' : '새 일정'}
              </Dialog.Title>
              <Dialog.Close className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </Dialog.Close>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Title */}
            <div>
              <label className={`${textStyles.label} mb-1`}>
                제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputStyles.base}
                placeholder="일정 제목"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className={`${textStyles.label} mb-1`}>
                설명 (선택)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputStyles.base}
                placeholder="일정 설명"
                rows={3}
              />
            </div>

            {/* Date */}
            <div>
              <label className={`${textStyles.label} mb-1`}>
                <Calendar className="inline h-4 w-4 mr-1" />
                날짜
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputStyles.base}
              />
            </div>

            {/* Time Range */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  시작 시간
                </label>
                <input
                  type="text"
                  value={startTime}
                  onChange={handleStartTimeChange}
                  onBlur={() => handleTimeBlur('start')}
                  placeholder="09:00"
                  className={inputStyles.base}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  예: 09:00, 930, 9시30분
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  종료 시간
                </label>
                <input
                  type="text"
                  value={endTime}
                  onChange={handleEndTimeChange}
                  onBlur={() => handleTimeBlur('end')}
                  placeholder="10:00"
                  className={inputStyles.base}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  예: 10:00, 1030, 10시30분
                </p>
              </div>
            </div>

            {/* Color */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Palette className="inline h-4 w-4 mr-1" />
                색상
              </label>
              <div className="flex space-x-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-lg ${
                      color === c ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-gray-800' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            {/* Recurrence */}
            <div>
              <label className={`${textStyles.label} mb-1`}>
                <Repeat className="inline h-4 w-4 mr-1" />
                반복
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className={inputStyles.base}
              >
                {RECURRENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Submit Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 ${buttonStyles.secondary}`}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 ${buttonStyles.primary} flex items-center justify-center`}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    저장 중...
                  </>
                ) : (schedule ? '수정' : '추가')}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}