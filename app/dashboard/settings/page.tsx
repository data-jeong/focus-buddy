'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, Moon, Sun, Monitor, Settings, Palette, BellOff, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { registerServiceWorker, subscribeToPushNotifications, requestNotificationPermission } from '@/lib/push-notifications'
import { useTheme } from '@/components/ThemeProvider'

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default')
  const supabase = createClient()
  const { theme, setTheme } = useTheme()

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
          theme: theme || 'system',
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
      toast.success('설정이 저장되었습니다', {
        icon: '✅',
        duration: 2000,
      })
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

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    await updateSettings({ theme: newTheme })
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Settings className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">설정 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const themeOptions = [
    {
      value: 'light',
      label: '라이트 모드',
      description: '밝은 테마',
      icon: Sun,
      preview: 'bg-gradient-to-br from-yellow-100 to-orange-100',
    },
    {
      value: 'dark',
      label: '다크 모드',
      description: '어두운 테마',
      icon: Moon,
      preview: 'bg-gradient-to-br from-gray-800 to-gray-900',
    },
    {
      value: 'system',
      label: '시스템 설정',
      description: '기기 설정 따르기',
      icon: Monitor,
      preview: 'bg-gradient-to-br from-gray-200 to-gray-400',
    },
  ]

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">설정</h1>
        <p className="text-gray-600 dark:text-gray-400">앱 환경설정과 개인화 옵션을 관리하세요</p>
      </div>

      <div className="space-y-8">
        {/* Theme Section */}
        <section>
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Palette className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">테마 설정</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              선호하는 색상 테마를 선택하세요
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {themeOptions.map((option) => {
              const Icon = option.icon
              const isSelected = theme === option.value
              
              return (
                <button
                  key={option.value}
                  onClick={() => handleThemeChange(option.value as 'light' | 'dark' | 'system')}
                  className={`relative group overflow-hidden rounded-xl border-2 transition-all ${
                    isSelected
                      ? 'border-indigo-600 dark:border-indigo-400 shadow-lg scale-105'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
                  }`}
                >
                  {/* Preview Background */}
                  <div className={`absolute inset-0 ${option.preview} opacity-20`} />
                  
                  {/* Content */}
                  <div className="relative p-6 text-left">
                    <div className="flex items-start justify-between mb-4">
                      <Icon className={`h-8 w-8 ${
                        isSelected 
                          ? 'text-indigo-600 dark:text-indigo-400' 
                          : 'text-gray-600 dark:text-gray-400'
                      }`} />
                      {isSelected && (
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 dark:bg-indigo-400">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                    <h3 className={`font-medium mb-1 ${
                      isSelected 
                        ? 'text-indigo-600 dark:text-indigo-400' 
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {option.label}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {option.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* Notifications Section */}
        <section>
          <div className="mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Bell className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">알림 설정</h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              중요한 업데이트와 리마인더를 받으세요
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${
                    settings.notifications_enabled 
                      ? 'bg-indigo-100 dark:bg-indigo-900/30' 
                      : 'bg-gray-100 dark:bg-gray-700'
                  }`}>
                    {settings.notifications_enabled ? (
                      <Bell className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                    ) : (
                      <BellOff className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      푸시 알림
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      할 일 리마인더와 일정 알림을 브라우저로 받습니다
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleNotificationToggle}
                  disabled={loading}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                    settings.notifications_enabled 
                      ? 'bg-indigo-600' 
                      : 'bg-gray-300 dark:bg-gray-600'
                  } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                      settings.notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {notificationPermission === 'denied' && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-400">
                        알림이 차단됨
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        브라우저 설정에서 이 사이트의 알림을 허용해주세요.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {notificationPermission === 'granted' && settings.notifications_enabled && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <Check className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-700 dark:text-green-300">
                        알림이 활성화되었습니다. 중요한 업데이트를 놓치지 않으세요!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Additional Settings Info */}
        <section className="pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>설정은 자동으로 저장되며 모든 기기에 동기화됩니다</p>
          </div>
        </section>
      </div>
    </div>
  )
}