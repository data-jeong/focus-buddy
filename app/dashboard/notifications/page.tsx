'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Clock, Calendar, CheckCircle, AlertCircle, Info } from 'lucide-react'
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
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
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
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
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

    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Focus Buddy 테스트 알림', {
        body: '알림이 정상적으로 작동합니다!',
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'test-notification',
        requireInteraction: false,
      })

      notification.onclick = () => {
        window.focus()
        notification.close()
      }

      toast.success('테스트 알림을 보냈습니다')
    } else {
      toast.error('알림 권한이 없습니다')
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">알림 센터</h1>
        <p className="text-gray-600 dark:text-gray-300">
          할 일과 일정 알림을 관리하세요
        </p>
      </div>

      {/* Notification Status */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {settings?.notifications_enabled ? (
              <>
                <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Bell className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    알림 활성화됨
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    브라우저 알림을 받고 있습니다
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <BellOff className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    알림 비활성화됨
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    설정에서 알림을 활성화하세요
                  </p>
                </div>
              </>
            )}
          </div>
          <button
            onClick={sendTestNotification}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            테스트 알림
          </button>
        </div>
      </div>

      {/* Upcoming Notifications */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          예정된 알림
        </h2>
        
        {notifications.length === 0 ? (
          <div className="text-center py-12">
            <Info className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              예정된 알림이 없습니다
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              할 일과 일정을 추가하면 여기에 표시됩니다
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = notification.icon
              return (
                <div
                  key={notification.id}
                  className="flex items-start space-x-3 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className={`p-2 rounded-lg ${notification.bgColor}`}>
                    <Icon className={`h-5 w-5 ${notification.color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {notification.title}
                    </p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      {notification.message}
                    </p>
                    <div className="flex items-center mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="h-3 w-3 mr-1" />
                      {format(new Date(notification.time), 'MM월 dd일 HH:mm', { locale: ko })}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Notification Settings Info */}
      <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
          <div className="ml-3">
            <h4 className="text-sm font-medium text-indigo-800 dark:text-indigo-300">
              알림 설정 팁
            </h4>
            <ul className="mt-2 text-sm text-indigo-700 dark:text-indigo-400 space-y-1">
              <li>• 할 일 마감 30분 전에 알림을 받습니다</li>
              <li>• 일정 시작 15분 전에 알림을 받습니다</li>
              <li>• 브라우저가 열려있을 때만 알림이 작동합니다</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}