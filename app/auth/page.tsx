'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthPage() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/dashboard')
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8">
        <h1 className="text-3xl font-bold text-center mb-2 text-gray-800">
          Focus Buddy
        </h1>
        <p className="text-center text-gray-600 mb-6">
          ADHD를 위한 스마트 일정 관리
        </p>
        <Auth
          supabaseClient={supabase}
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
    </div>
  )
}