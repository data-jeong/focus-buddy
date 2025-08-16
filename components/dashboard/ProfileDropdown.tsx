'use client'

import { useState, useRef, useEffect } from 'react'
import { Trophy, Settings, LogOut, ChevronDown, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
    avatar_url?: string
  }
}

export default function ProfileDropdown({ user }: { user: User }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    await supabase.auth.signOut()
    setTimeout(() => {
      router.push('/auth')
    }, 500)
  }

  return (
    <>
      {/* 로그아웃 로딩 오버레이 */}
      {isLoggingOut && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl flex flex-col items-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            <div className="text-center">
              <p className="text-lg font-semibold text-gray-900 dark:text-white">로그아웃 중입니다...</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">잠시만 기다려주세요</p>
            </div>
          </div>
        </div>
      )}
      
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {user.email?.split('@')[0]}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
        </div>
        <div className="h-10 w-10 rounded-full bg-indigo-500 flex items-center justify-center">
          <span className="text-white font-medium">
            {user.email?.[0].toUpperCase()}
          </span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {user.email?.split('@')[0]}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{user.email}</p>
          </div>
          
          <Link
            href="/dashboard/achievements"
            className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setIsOpen(false)}
          >
            <Trophy className="h-4 w-4" />
            <span>나의 업적</span>
          </Link>
          
          <Link
            href="/dashboard/settings"
            className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            onClick={() => setIsOpen(false)}
          >
            <Settings className="h-4 w-4" />
            <span>설정</span>
          </Link>
          
          <hr className="my-1 border-gray-200 dark:border-gray-700" />
          
          <button
            onClick={handleSignOut}
            disabled={isLoggingOut}
            className="flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>로그아웃 중...</span>
              </>
            ) : (
              <>
                <LogOut className="h-4 w-4" />
                <span>로그아웃</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
    </>
  )
}