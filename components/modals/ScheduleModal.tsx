'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Calendar, Clock, Repeat } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
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
  { value: 'weekdays', label: '평일 (월-금)' },
  { value: 'weekly', label: '매주' },
  { value: 'biweekly', label: '2주마다' },
  { value: 'monthly', label: '매월' },
  { value: 'custom', label: '사용자 지정' },
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
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [recurrenceType, setRecurrenceType] = useState('none')
  const [customDays, setCustomDays] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (schedule) {
      setTitle(schedule.title || '')
      setDescription(schedule.description || '')
      setStartTime(schedule.start_time ? format(new Date(schedule.start_time), "yyyy-MM-dd'T'HH:mm") : '')
      setEndTime(schedule.end_time ? format(new Date(schedule.end_time), "yyyy-MM-dd'T'HH:mm") : '')
      setColor(schedule.color || COLORS[0])
      
      // Parse recurrence pattern
      if (schedule.recurrence_pattern) {
        const pattern = schedule.recurrence_pattern
        setRecurrenceType(pattern.type || 'none')
        setCustomDays(pattern.days || [])
      }
    } else {
      // Reset form
      setTitle('')
      setDescription('')
      setColor(COLORS[0])
      setRecurrenceType('none')
      setCustomDays([])
      
      // Set initial times if provided
      if (initialDate && initialStartTime && initialEndTime) {
        const dateStr = format(initialDate, 'yyyy-MM-dd')
        setStartTime(`${dateStr}T${initialStartTime}`)
        setEndTime(`${dateStr}T${initialEndTime}`)
      } else {
        setStartTime('')
        setEndTime('')
      }
    }
  }, [schedule, open, initialDate, initialStartTime, initialEndTime])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('제목을 입력해주세요')
      return
    }
    
    if (!startTime || !endTime) {
      toast.error('시간을 선택해주세요')
      return
    }
    
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('로그인이 필요합니다')
        return
      }

      const recurrencePattern = recurrenceType !== 'none' 
        ? {
            type: recurrenceType,
            days: recurrenceType === 'custom' ? customDays : null
          }
        : null

      const scheduleData = {
        title,
        description: description || null,
        start_time: startTime,
        end_time: endTime,
        color,
        recurring: recurrenceType !== 'none',
        recurrence_pattern: recurrencePattern,
        user_id: user.id,
      }

      if (schedule) {
        await supabase
          .from('schedules')
          .update(scheduleData)
          .eq('id', schedule.id)
        toast.success('일정이 수정되었습니다')
      } else {
        await supabase
          .from('schedules')
          .insert([scheduleData])
        toast.success('일정이 추가되었습니다')
      }

      onClose()
    } catch (error) {
      toast.error('오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const toggleCustomDay = (day: string) => {
    setCustomDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day]
    )
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md z-50 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {schedule ? '일정 수정' : '새 일정 추가'}
            </Dialog.Title>
            <Dialog.Close className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                제목 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                설명
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Clock className="inline h-4 w-4 mr-1" />
                  시작 시간 *
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Clock className="inline h-4 w-4 mr-1" />
                  종료 시간 *
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                색상
              </label>
              <div className="flex space-x-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full ${
                      color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Repeat className="inline h-4 w-4 mr-1" />
                반복 설정
              </label>
              <select
                value={recurrenceType}
                onChange={(e) => setRecurrenceType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {RECURRENCE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              
              {recurrenceType === 'custom' && (
                <div className="mt-3 flex space-x-2">
                  {['월', '화', '수', '목', '금', '토', '일'].map((day, index) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleCustomDay(index.toString())}
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                        customDays.includes(index.toString())
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {loading ? '처리 중...' : schedule ? '수정하기' : '저장하기'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}