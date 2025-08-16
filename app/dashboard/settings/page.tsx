'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings, Coffee, MessageSquare, Heart, Github, ExternalLink, Send } from 'lucide-react'
import toast from 'react-hot-toast'
import { cardStyles, buttonStyles, headerStyles } from '@/lib/constants/styles'

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>(null)
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
        {/* Developer Support Section */}
        <section>
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <Heart className="h-5 w-5 text-red-500" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                개발자 후원
              </h2>
            </div>
            <p className="text-base text-gray-600 dark:text-gray-300">
              Focus Buddy 개발을 응원해주세요!
            </p>
          </div>

          <div className={cardStyles.full}>
            <div className="space-y-6">
              {/* Toonation - 가장 인기있는 한국 후원 플랫폼 */}
              <div className="text-center pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full">
                    <Heart className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  투네이션으로 후원하기 🍩
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                  한국에서 가장 많이 사용하는 크리에이터 후원 플랫폼
                </p>
                <a
                  href="https://toon.at/donate/focusbuddy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all transform hover:scale-105"
                >
                  <Heart className="h-4 w-4 mr-2" />
                  투네이션 후원
                  <ExternalLink className="h-3 w-3 ml-2" />
                </a>
              </div>

              {/* Kakao Pay 정기후원 */}
              <div className="text-center pb-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-yellow-400 rounded-full">
                    <svg className="h-8 w-8 text-gray-900" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.85 5.33 4.65 6.75-.2.72-.73 2.62-.76 2.74-.05.18.14.32.31.22.21-.12 3.36-2.21 3.57-2.35.63.09 1.28.14 1.95.14 5.52 0 10-3.58 10-8s-4.48-8-10-8z"/>
                    </svg>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  카카오페이 정기후원 💛
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                  매월 자동으로 후원하는 정기후원 서비스
                </p>
                <a
                  href="https://qr.kakaopay.com/FocusBuddy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-5 py-2.5 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-medium rounded-lg transition-colors"
                >
                  카카오페이 정기후원
                  <ExternalLink className="h-3 w-3 ml-2" />
                </a>
              </div>

              {/* GitHub Sponsors */}
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <div className="p-3 bg-gray-900 dark:bg-gray-700 rounded-full">
                    <Github className="h-8 w-8 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  GitHub 스폰서 💜
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
                  개발자를 위한 글로벌 후원 플랫폼 (달러 결제)
                </p>
                <a
                  href="https://github.com/sponsors/yourusername"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-5 py-2.5 bg-gray-900 hover:bg-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                >
                  <Github className="h-4 w-4 mr-2" />
                  GitHub Sponsors
                  <ExternalLink className="h-3 w-3 ml-2" />
                </a>
              </div>

              {/* 후원 안내 메시지 */}
              <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                <p className="text-sm text-indigo-700 dark:text-indigo-300 text-center">
                  💡 모든 후원 플랫폼은 사업자 등록이 되어있어 안전하게 후원하실 수 있습니다
                </p>
              </div>
            </div>
          </div>
        </section>

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

          <div className={cardStyles.full}>
            <div className="text-center text-gray-500 dark:text-gray-400">
              추가 설정 옵션이 곧 제공될 예정입니다
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