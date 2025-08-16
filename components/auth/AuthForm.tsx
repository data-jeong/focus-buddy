'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Mail, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'

interface AuthFormProps {
  onSubmit?: () => void
  redirectTo?: string
}

export default function AuthForm({ onSubmit, redirectTo }: AuthFormProps) {
  const supabase = createClient()
  const [view, setView] = useState<'sign_in' | 'sign_up'>('sign_in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [emailSent, setEmailSent] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // 재발송 쿨다운 타이머
  const startResendCooldown = () => {
    setResendCooldown(60) // 60초 쿨다운
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setMessage({ 
          type: 'error', 
          text: '이메일 인증이 필요합니다. 받은 편지함을 확인해주세요.' 
        })
        setEmailSent(true)
      } else if (error.message.includes('Invalid login credentials')) {
        setMessage({ 
          type: 'error', 
          text: '이메일 또는 비밀번호가 올바르지 않습니다.' 
        })
      } else {
        setMessage({ 
          type: 'error', 
          text: error.message 
        })
      }
    } else {
      onSubmit?.()
    }

    setLoading(false)
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectTo || `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      if (error.message.includes('User already registered')) {
        setMessage({ 
          type: 'error', 
          text: '이미 가입된 이메일입니다. 로그인을 시도하거나 비밀번호를 재설정하세요.' 
        })
      } else {
        setMessage({ 
          type: 'error', 
          text: error.message 
        })
      }
    } else {
      setMessage({ 
        type: 'success', 
        text: '회원가입이 완료되었습니다! 이메일을 확인하여 계정을 활성화해주세요.' 
      })
      setEmailSent(true)
      startResendCooldown()
    }

    setLoading(false)
  }

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return
    
    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: redirectTo || `${window.location.origin}/dashboard`,
      },
    })

    if (error) {
      setMessage({ 
        type: 'error', 
        text: '이메일 재발송에 실패했습니다. 잠시 후 다시 시도해주세요.' 
      })
    } else {
      setMessage({ 
        type: 'success', 
        text: '인증 이메일이 재발송되었습니다. 받은 편지함을 확인해주세요.' 
      })
      startResendCooldown()
    }

    setLoading(false)
  }

  const handlePasswordReset = async () => {
    if (!email) {
      setMessage({ 
        type: 'error', 
        text: '이메일을 입력해주세요.' 
      })
      return
    }

    setLoading(true)
    setMessage(null)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    })

    if (error) {
      setMessage({ 
        type: 'error', 
        text: error.message 
      })
    } else {
      setMessage({ 
        type: 'success', 
        text: '비밀번호 재설정 이메일이 발송되었습니다.' 
      })
    }

    setLoading(false)
  }

  return (
    <div className="w-full space-y-6">
      {/* 탭 전환 */}
      <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
        <button
          onClick={() => {
            setView('sign_in')
            setMessage(null)
            setEmailSent(false)
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            view === 'sign_in'
              ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          로그인
        </button>
        <button
          onClick={() => {
            setView('sign_up')
            setMessage(null)
            setEmailSent(false)
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            view === 'sign_up'
              ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
          }`}
        >
          회원가입
        </button>
      </div>

      {/* 메시지 */}
      {message && (
        <div className={`p-4 rounded-lg flex items-start space-x-3 ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          )}
          <p className="text-sm">{message.text}</p>
        </div>
      )}

      {/* 폼 */}
      <form onSubmit={view === 'sign_in' ? handleSignIn : handleSignUp} className="space-y-4">
        {/* 이메일 */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            이메일
          </label>
          <div className="relative">
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 pl-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder="your@email.com"
              required
              disabled={loading}
            />
            <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* 비밀번호 */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            비밀번호
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 pl-10 pr-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
              placeholder={view === 'sign_up' ? '최소 6자 이상' : '••••••••'}
              required
              disabled={loading}
              minLength={view === 'sign_up' ? 6 : undefined}
            />
            <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        {/* 비밀번호 찾기 (로그인 시) */}
        {view === 'sign_in' && (
          <div className="text-right">
            <button
              type="button"
              onClick={handlePasswordReset}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
            >
              비밀번호를 잊으셨나요?
            </button>
          </div>
        )}

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
              {view === 'sign_in' ? '로그인 중...' : '가입 중...'}
            </>
          ) : (
            <>{view === 'sign_in' ? '로그인' : '회원가입'}</>
          )}
        </button>
      </form>

      {/* 이메일 재발송 버튼 */}
      {emailSent && (
        <div className="text-center space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            이메일이 도착하지 않으셨나요?
          </p>
          <button
            onClick={handleResendEmail}
            disabled={loading || resendCooldown > 0}
            className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mail className="h-4 w-4 mr-2" />
            {resendCooldown > 0 
              ? `${resendCooldown}초 후 재발송 가능` 
              : '인증 이메일 재발송'}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            스팸 메일함도 확인해주세요
          </p>
        </div>
      )}
    </div>
  )
}