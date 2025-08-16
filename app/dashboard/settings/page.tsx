'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, MessageSquare, Github, ExternalLink, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { cardStyles, buttonStyles, headerStyles } from '@/lib/constants/styles'

interface UserSettings {
  id: string
  user_id: string
  theme: string
  created_at?: string
  updated_at?: string
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [sendingFeedback, setSendingFeedback] = useState(false)
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

  const updateSettings = async (updates: Partial<UserSettings>) => {
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">피드백</h1>
        <p className="text-base text-gray-600 dark:text-gray-300">
          더 나은 Focus Buddy를 위한 여러분의 의견을 들려주세요
        </p>
      </div>

      <div className="space-y-8">

        {/* Feedback Section */}
        <section>
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <MessageSquare className="h-5 w-5 text-blue-500" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                개발 의견 & 피드백
              </h2>
            </div>
            <p className="text-base text-gray-600 dark:text-gray-300">
              더 나은 Focus Buddy를 위한 여러분의 의견을 들려주세요
            </p>
          </div>

          <div className={cardStyles.full}>
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Github className="h-6 w-6 text-gray-700 dark:text-gray-300" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    GitHub Issues
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    GitHub에서 이슈를 등록하고 개발 과정에 참여하세요
                  </p>
                  <a
                    href="https://github.com/data-jeong/focus-buddy/issues"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    <Github className="h-4 w-4 mr-2" />
                    GitHub 방문
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </a>
                </div>
              </div>
            </div>
        </section>

        {/* Quick Feedback Form */}
        <section>
          <div className={cardStyles.full}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              빠른 피드백
            </h3>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="여기에 의견을 작성해주세요..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              rows={4}
            />
            <div className="mt-4 flex justify-end">
              <button
                onClick={async () => {
                  if (!feedback.trim()) {
                    toast.error('피드백 내용을 입력해주세요')
                    return
                  }
                  
                  setSendingFeedback(true)
                  
                  try {
                    const { data: { user } } = await supabase.auth.getUser()
                    
                    if (!user) {
                      toast.error('로그인이 필요합니다')
                      setSendingFeedback(false)
                      return
                    }
                    
                    const { error } = await supabase
                      .from('feedback')
                      .insert({
                        user_id: user.id,
                        message: feedback.trim()
                      })
                    
                    if (error) {
                      throw error
                    }
                    
                    setFeedback('')
                    toast.success('피드백이 전송되었습니다! 감사합니다 💜', {
                      duration: 3000
                    })
                  } catch (error) {
                    console.error('피드백 저장 실패:', error)
                    toast.error('피드백 전송에 실패했습니다. 다시 시도해주세요.')
                  } finally {
                    setSendingFeedback(false)
                  }
                }}
                disabled={sendingFeedback}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                {sendingFeedback ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    전송 중...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    피드백 전송
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}