'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Moon, Sun, Monitor } from 'lucide-react'
import toast from 'react-hot-toast'
import { registerServiceWorker, subscribeToPushNotifications, requestNotificationPermission } from '@/lib/push-notifications'
import { useSearchParams } from 'next/navigation'

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const supabase = createClient()
  const searchParams = useSearchParams()

  useEffect(() => {
    fetchSettings()
    
    // Check notification permission
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  const fetchSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!data) {
      // Create default settings
      const { data: newSettings } = await supabase
        .from('user_settings')
        .insert([{
          user_id: user.id,
          notifications_enabled: false,
          theme: 'system',
        }])
        .select()
        .single()
      
      setSettings(newSettings)
    } else {
      setSettings(data)
    }
  }

  const updateSettings = async (updates: any) => {
    if (!settings) return
    
    setLoading(true)
    const { error } = await supabase
      .from('user_settings')
      .update(updates)
      .eq('id', settings.id)

    if (error) {
      toast.error('설정 저장 실패')
    } else {
      toast.success('설정이 저장되었습니다')
      setSettings({ ...settings, ...updates })
    }
    setLoading(false)
  }

  const handleNotificationToggle = async () => {
    if (!settings) return

    if (!settings.notifications_enabled) {
      // Enable notifications
      const permission = await requestNotificationPermission()
      if (permission) {
        await registerServiceWorker()
        await subscribeToPushNotifications()
        await updateSettings({ notifications_enabled: true })
        setNotificationPermission('granted')
      } else {
        toast.error('알림 권한이 거부되었습니다')
      }
    } else {
      // Disable notifications
      await updateSettings({ notifications_enabled: false })
    }
  }


  const handleThemeChange = async (theme: string) => {
    await updateSettings({ theme })
    
    // Apply theme
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  if (!settings) {
    return <div className="flex items-center justify-center h-96">로딩 중...</div>
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">설정</h1>

      {/* Notifications */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Bell className="h-5 w-5 text-gray-600" />
            <div>
              <h3 className="text-sm font-medium text-gray-900">푸시 알림</h3>
              <p className="text-sm text-gray-500">할 일 리마인더와 일정 알림을 받습니다</p>
            </div>
          </div>
          <button
            onClick={handleNotificationToggle}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              settings.notifications_enabled ? 'bg-indigo-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.notifications_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
        
        {notificationPermission === 'denied' && (
          <div className="mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
            브라우저에서 알림이 차단되었습니다. 브라우저 설정에서 알림을 허용해주세요.
          </div>
        )}
      </div>


      {/* Theme */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">테마</h3>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => handleThemeChange('light')}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-colors ${
              settings.theme === 'light'
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Sun className="h-6 w-6 mb-1 text-gray-600" />
            <span className="text-sm">라이트</span>
          </button>
          <button
            onClick={() => handleThemeChange('dark')}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-colors ${
              settings.theme === 'dark'
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Moon className="h-6 w-6 mb-1 text-gray-600" />
            <span className="text-sm">다크</span>
          </button>
          <button
            onClick={() => handleThemeChange('system')}
            className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-colors ${
              settings.theme === 'system'
                ? 'border-indigo-600 bg-indigo-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <Monitor className="h-6 w-6 mb-1 text-gray-600" />
            <span className="text-sm">시스템</span>
          </button>
        </div>
      </div>
    </div>
  )
}