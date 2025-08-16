'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings } from 'lucide-react'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
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
          theme: 'dark',
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

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">설정</h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          앱 환경설정을 관리하세요
        </p>
      </div>

      <div className="space-y-8">
        {/* Theme Settings Section */}
        <section>
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <Settings className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                일반 설정
              </h2>
            </div>
            <p className="text-base text-gray-600 dark:text-gray-300">
              앱의 기본 설정을 관리합니다
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-6">
              <div className="text-center text-gray-500 dark:text-gray-400">
                추가 설정 옵션이 곧 제공될 예정입니다
              </div>
            </div>
          </div>
        </section>

        {/* Additional Settings Info */}
        <section className="pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              설정은 자동으로 저장되며 모든 기기에 동기화됩니다
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}