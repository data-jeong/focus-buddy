'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Clock, Calendar, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [settings, setSettings] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchNotificationSettings()
    generateNotifications()
  }, [])

  const fetchNotificationSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    setSettings(data)
  }

  const generateNotifications = async () => {
    // Get upcoming todos and schedules
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [todosResponse, schedulesResponse] = await Promise.all([
      supabase
        .from('todos')
        .select('*')
        .eq('completed', false)
        .not('due_date', 'is', null)
        .gte('due_date', now.toISOString())
        .lte('due_date', tomorrow.toISOString())
        .order('due_date', { ascending: true }),
      supabase
        .from('schedules')
        .select('*')
        .gte('start_time', now.toISOString())
        .lte('start_time', tomorrow.toISOString())
        .order('start_time', { ascending: true })
    ])

    const notificationsList = []

    // Add todo notifications
    if (todosResponse.data) {
      todosResponse.data.forEach(todo => {
        notificationsList.push({
          id: `todo-${todo.id}`,
          type: 'todo',
          title: '할 일 마감 임박',
          message: todo.title,
          time: todo.due_date,
          icon: CheckCircle,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
        })
      })
    }

    // Add schedule notifications
    if (schedulesResponse.data) {
      schedulesResponse.data.forEach(schedule => {
        notificationsList.push({
          id: `schedule-${schedule.id}`,
          type: 'schedule',
          title: '예정된 일정',
          message: schedule.title,
          time: schedule.start_time,
          icon: Calendar,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
        })
      })
    }

    // Sort by time
    notificationsList.sort((a, b) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    )

    setNotifications(notificationsList)
  }

  const sendTestNotification = async () => {
    if (!settings?.notifications_enabled) {
      toast.error('먼저 설정에서 알림을 활성화해주세요')
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const response = await fetch('/api/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'Focus Buddy 테스트 알림',
          body: '알림이 정상적으로 작동합니다!',
          userId: user.id,
        }),
      })

      if (response.ok) {
        toast.success('테스트 알림을 전송했습니다')
      } else {
        toast.error('알림 전송에 실패했습니다')
      }
    } catch (error) {
      toast.error('알림 전송 중 오류가 발생했습니다')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">알림 센터</h1>
            <p className="text-sm text-gray-600 mt-1">
              예정된 일정과 할 일 마감을 확인하세요
            </p>
          </div>
          <button
            onClick={sendTestNotification}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
          >
            테스트 알림 보내기
          </button>
        </div>
      </div>

      {/* Notification Status */}
      {settings && (
        <div className={`rounded-xl p-4 ${
          settings.notifications_enabled 
            ? 'bg-green-50 border border-green-200' 
            : 'bg-gray-50 border border-gray-200'
        }`}>
          <div className="flex items-center space-x-3">
            {settings.notifications_enabled ? (
              <>
                <Bell className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-700">알림이 활성화되어 있습니다</span>
              </>
            ) : (
              <>
                <BellOff className="h-5 w-5 text-gray-600" />
                <span className="text-sm text-gray-700">알림이 비활성화되어 있습니다</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Upcoming Notifications */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 p-4">
          <h2 className="text-lg font-medium text-gray-900">예정된 알림</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>예정된 알림이 없습니다</p>
            </div>
          ) : (
            notifications.map((notification) => {
              const Icon = notification.icon
              const notificationTime = new Date(notification.time)
              const isWithinHour = notificationTime.getTime() - Date.now() < 60 * 60 * 1000
              
              return (
                <div key={notification.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start space-x-3">
                    <div className={`p-2 rounded-lg ${notification.bgColor}`}>
                      <Icon className={`h-5 w-5 ${notification.color}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <div className="flex items-center mt-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        <span className={isWithinHour ? 'text-red-600 font-medium' : ''}>
                          {format(notificationTime, 'MM월 dd일 HH:mm', { locale: ko })}
                        </span>
                        {isWithinHour && (
                          <span className="ml-2 px-2 py-0.5 bg-red-100 text-red-700 rounded">
                            곧 시작
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}