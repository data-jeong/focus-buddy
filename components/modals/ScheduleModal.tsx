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
  initialEndTime 
}: ScheduleModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [startHour, setStartHour] = useState('09')
  const [startMinute, setStartMinute] = useState('00')
  const [endHour, setEndHour] = useState('10')
  const [endMinute, setEndMinute] = useState('00')
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
      setStartHour(format(scheduleStart, 'HH'))
      setStartMinute(format(scheduleStart, 'mm'))
      setEndHour(format(scheduleEnd, 'HH'))
      setEndMinute(format(scheduleEnd, 'mm'))
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
        const [h, m] = initialStartTime.split(':')
        setStartHour(h)
        setStartMinute(m)
      } else {
        setStartHour('09')
        setStartMinute('00')
      }
      
      if (initialEndTime) {
        const [h, m] = initialEndTime.split(':')
        setEndHour(h)
        setEndMinute(m)
      } else {
        setEndHour('10')
        setEndMinute('00')
      }
    }
  }, [schedule, open, initialDate, initialStartTime, initialEndTime])

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
  const minutes = ['00', '15', '30', '45']

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

    // Combine date and time
    const startDateTime = new Date(`${date}T${startHour}:${startMinute}:00`)
    const endDateTime = new Date(`${date}T${endHour}:${endMinute}:00`)

    if (endDateTime <= startDateTime) {
      toast.error('종료 시간은 시작 시간보다 늦어야 합니다')
      return
    }

    // Check if end time goes past 23:30
    const endHours = parseInt(endHour)
    const endMinutes = parseInt(endMinute)
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
        onClose()
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
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  시작 시간
                </label>
                <div className="flex items-center space-x-2">
                  <select
                    value={startHour}
                    onChange={(e) => setStartHour(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {hours.map(h => (
                      <option key={h} value={h}>{h}시</option>
                    ))}
                  </select>
                  <span className="text-gray-500 dark:text-gray-400">:</span>
                  <select
                    value={startMinute}
                    onChange={(e) => setStartMinute(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {minutes.map(m => (
                      <option key={m} value={m}>{m}분</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Clock className="inline h-4 w-4 mr-1" />
                  종료 시간
                </label>
                <div className="flex items-center space-x-2">
                  <select
                    value={endHour}
                    onChange={(e) => setEndHour(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {hours.map(h => (
                      <option key={h} value={h}>{h}시</option>
                    ))}
                  </select>
                  <span className="text-gray-500 dark:text-gray-400">:</span>
                  <select
                    value={endMinute}
                    onChange={(e) => setEndMinute(e.target.value)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {minutes.map(m => (
                      <option key={m} value={m}>{m}분</option>
                    ))}
                  </select>
                </div>
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