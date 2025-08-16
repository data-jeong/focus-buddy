'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Calendar, Clock, Repeat, Palette } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { format, parse } from 'date-fns'
import { ko } from 'date-fns/locale'

interface ScheduleModalProps {
  open: boolean
  onClose: () => void
  schedule?: any
  initialDate?: Date
  initialStartTime?: string
  initialEndTime?: string
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
  initialEndTime 
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
      
      if (initialStartTime) {
        setStartTime(initialStartTime)
      } else {
        setStartTime('09:00')
      }
      
      if (initialEndTime) {
        setEndTime(initialEndTime)
      } else {
        setEndTime('10:00')
      }
    }
  }, [schedule, open, initialDate, initialStartTime, initialEndTime])

  const validateTime = (time: string) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
    return timeRegex.test(time)
  }

  const formatTimeInput = (value: string): string => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format as HH:MM
    if (digits.length <= 2) {
      return digits
    } else if (digits.length <= 4) {
      return `${digits.slice(0, 2)}:${digits.slice(2)}`
    } else {
      return `${digits.slice(0, 2)}:${digits.slice(2, 4)}`
    }
  }

  const handleTimeChange = (value: string, setter: (val: string) => void) => {
    const formatted = formatTimeInput(value)
    setter(formatted)
  }

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

    // Validate time format
    if (!validateTime(startTime)) {
      toast.error('시작 시간 형식이 올바르지 않습니다 (HH:MM)')
      return
    }

    if (!validateTime(endTime)) {
      toast.error('종료 시간 형식이 올바르지 않습니다 (HH:MM)')
      return
    }

    // Combine date and time
    const startDateTime = new Date(`${date}T${startTime}:00`)
    const endDateTime = new Date(`${date}T${endTime}:00`)

    if (endDateTime <= startDateTime) {
      toast.error('종료 시간은 시작 시간보다 늦어야 합니다')
      return
    }

    // Check if end time goes past 23:30
    const endHours = parseInt(endTime.split(':')[0])
    const endMinutes = parseInt(endTime.split(':')[1])
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
        toast.error('일정 수정 실패')
      } else {
        toast.success('일정이 수정되었습니다')
        onClose()
      }
    } else {
      // Create new schedule
      const { error } = await supabase
        .from('schedules')
        .insert([scheduleData])

      if (error) {
        toast.error('일정 추가 실패')
      } else {
        toast.success('일정이 추가되었습니다')
        onClose()
      }
    }
    
    setLoading(false)
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto z-50">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                제목
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="일정 제목"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                설명 (선택)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="일정 설명"
                rows={3}
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Calendar className="inline h-4 w-4 mr-1" />
                날짜
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Clock className="inline h-4 w-4 mr-1" />
                  시작 시간
                </label>
                <input
                  type="text"
                  value={startTime}
                  onChange={(e) => handleTimeChange(e.target.value, setStartTime)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="0900"
                  maxLength={5}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Clock className="inline h-4 w-4 mr-1" />
                  종료 시간
                </label>
                <input
                  type="text"
                  value={endTime}
                  onChange={(e) => handleTimeChange(e.target.value, setEndTime)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="1000"
                  maxLength={5}
                />
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <Repeat className="inline h-4 w-4 mr-1" />
                반복
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? '저장 중...' : (schedule ? '수정' : '추가')}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}