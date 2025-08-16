'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2, Sparkles, Brain, Target, Clock } from 'lucide-react'

export default function AuthPage() {
  const supabase = createClient()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        setIsLoading(true)
        setTimeout(() => {
          router.push('/dashboard')
        }, 500)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  // 캐치프레이즈 목록 (랜덤 선택)
  const catchphrases = [
    { main: "집중의 시작, 성공의 완성", sub: "당신의 하루를 체계적으로 관리하세요" },
    { main: "시간을 지배하는 자가 미래를 만든다", sub: "포커스 버디와 함께 목표를 달성하세요" },
    { main: "작은 습관이 큰 변화를 만듭니다", sub: "오늘부터 시작하는 생산성 혁명" },
    { main: "Focus on What Matters", sub: "중요한 일에 집중하는 스마트한 방법" },
    { main: "당신의 잠재력을 깨우는 시간", sub: "체계적인 일정 관리로 더 나은 내일을" }
  ]
  
  const [currentPhrase] = useState(() => 
    catchphrases[Math.floor(Math.random() * catchphrases.length)]
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      {/* 로딩 오버레이 */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">로그인 중입니다...</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">대시보드로 이동하고 있습니다</p>
            </div>
          </div>
        </div>
      )}
      
      <div className="max-w-md w-full">
        {/* 로고와 캐치프레이즈 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg mb-4">
            <Target className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Focus Buddy
          </h1>
          <div className="space-y-2">
            <p className="text-xl font-semibold text-gray-800 dark:text-gray-200">
              {currentPhrase.main}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {currentPhrase.sub}
            </p>
          </div>
        </div>
        
        {/* 로그인 폼 */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
          <Auth
            supabaseClient={supabase}
            onSubmit={() => setIsLoading(true)}
            appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#4F46E5',
                  brandAccent: '#4338CA',
                },
              },
            },
          }}
          localization={{
            variables: {
              sign_in: {
                email_label: '이메일',
                password_label: '비밀번호',
                button_label: '로그인',
                loading_button_label: '로그인 중...',
                social_provider_text: '{{provider}}로 로그인',
                link_text: '이미 계정이 있으신가요? 로그인',
              },
              sign_up: {
                email_label: '이메일',
                password_label: '비밀번호',
                button_label: '회원가입',
                loading_button_label: '가입 중...',
                social_provider_text: '{{provider}}로 가입',
                link_text: '계정이 없으신가요? 회원가입',
                confirmation_text: '확인 이메일을 확인해주세요',
              },
            },
          }}
          providers={[]}
          view="sign_in"
          />
        </div>
        
        {/* 하단 특징 아이콘 */}
        <div className="flex justify-center items-center space-x-8 mt-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-white/80 dark:bg-gray-800/80 rounded-xl flex items-center justify-center shadow-lg mb-2">
              <Brain className="h-6 w-6 text-indigo-600" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">스마트 관리</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white/80 dark:bg-gray-800/80 rounded-xl flex items-center justify-center shadow-lg mb-2">
              <Clock className="h-6 w-6 text-purple-600" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">시간 추적</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-white/80 dark:bg-gray-800/80 rounded-xl flex items-center justify-center shadow-lg mb-2">
              <Sparkles className="h-6 w-6 text-pink-600" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">생산성 향상</p>
          </div>
        </div>
      </div>
    </div>
  )
}