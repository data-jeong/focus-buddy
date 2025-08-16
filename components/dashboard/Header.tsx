'use client'

import { Bell, Menu, Clock, Calendar, CheckCircle } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import ProfileDropdown from './ProfileDropdown'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function Header({ user }: { user: any }) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])
  const notificationRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    setCurrentTime(new Date())
    fetchNotifications()
    
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchNotifications = async () => {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [todosResponse, schedulesResponse] = await Promise.all([
      supabase
        .from('todos')
        .select('*')
        .eq('completed', false)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('schedules')
        .select('*')
        .gte('start_time', now.toISOString())
        .lte('start_time', tomorrow.toISOString())
        .order('start_time', { ascending: true })
        .limit(3)
    ])

    const notificationsList = []

    if (schedulesResponse.data) {
      schedulesResponse.data.forEach(schedule => {
        notificationsList.push({
          id: `schedule-${schedule.id}`,
          type: 'schedule',
          title: schedule.title,
          time: schedule.start_time,
          icon: Calendar,
        })
      })
    }

    if (todosResponse.data) {
      todosResponse.data.forEach(todo => {
        notificationsList.push({
          id: `todo-${todo.id}`,
          type: 'todo',
          title: todo.title,
          priority: todo.priority,
          icon: CheckCircle,
        })
      })
    }

    setNotifications(notificationsList.slice(0, 5))
  }

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="ml-4 lg:ml-0">
              {mounted && currentTime ? (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {format(currentTime, 'yyyy년 MM월 dd일 EEEE', { locale: ko })}
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    {format(currentTime, 'HH:mm:ss')}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    &nbsp;
                  </p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                    --:--:--
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setNotificationOpen(!notificationOpen)}
                className="p-2 rounded-full text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 relative"
              >
                <Bell className="h-6 w-6" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              
              {notificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">알림</h3>
                      <Link
                        href="/dashboard/notifications"
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        onClick={() => setNotificationOpen(false)}
                      >
                        모두 보기
                      </Link>
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                        새로운 알림이 없습니다
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {notifications.map((notification) => {
                          const Icon = notification.icon
                          return (
                            <div key={notification.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                              <div className="flex items-start space-x-3">
                                <Icon className="h-5 w-5 text-gray-400 dark:text-gray-500 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-gray-900 dark:text-gray-100 truncate">
                                    {notification.title}
                                  </p>
                                  {notification.time && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                      <Clock className="inline h-3 w-3 mr-1" />
                                      {format(new Date(notification.time), 'HH:mm')}
                                    </p>
                                  )}
                                  {notification.priority && (
                                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                                      notification.priority === 'high' 
                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                        : notification.priority === 'medium'
                                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400'
                                    }`}>
                                      {notification.priority === 'high' ? '높음' : notification.priority === 'medium' ? '보통' : '낮음'}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <ProfileDropdown user={user} />
          </div>
        </div>
      </div>
    </header>
  )
}