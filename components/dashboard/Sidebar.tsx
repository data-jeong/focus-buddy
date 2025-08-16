'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, CheckSquare, Calendar, Trophy, Settings, 
  LogOut, Menu, X, ChevronLeft, ChevronRight 
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: LayoutDashboard, color: 'text-blue-500' },
  { name: '할 일', href: '/dashboard/todos', icon: CheckSquare, color: 'text-green-500' },
  { name: '시간표', href: '/dashboard/schedule', icon: Calendar, color: 'text-purple-500' },
  { name: '나의 업적', href: '/dashboard/achievements', icon: Trophy, color: 'text-yellow-500' },
  { name: '설정', href: '/dashboard/settings', icon: Settings, color: 'text-gray-500' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  const NavContent = () => (
    <>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className={`
                group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all
                ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                }
              `}
            >
              <Icon
                className={`
                  ${isCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5 transition-colors
                  ${isActive ? 'text-white' : item.color}
                `}
              />
              {!isCollapsed && (
                <span className="transition-opacity">
                  {item.name}
                </span>
              )}
              {!isCollapsed && isActive && (
                <div className="ml-auto w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              )}
            </Link>
          )
        })}
      </nav>
      <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700/50">
        <button
          onClick={handleSignOut}
          className="group flex items-center px-3 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 w-full transition-all"
        >
          <LogOut className={`${isCollapsed ? 'mx-auto' : 'mr-3'} h-5 w-5`} />
          {!isCollapsed && <span>로그아웃</span>}
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
      >
        {isMobileMenuOpen ? (
          <X className="h-6 w-6 text-gray-700 dark:text-gray-300" />
        ) : (
          <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
        )}
      </button>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <div className={`
        lg:hidden fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700/50">
            <Link 
              href="/dashboard" 
              className="flex items-center space-x-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">FB</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Focus Buddy
              </span>
            </Link>
          </div>
          <NavContent />
        </div>
      </div>

      {/* Desktop Sidebar */}
      <div className={`
        hidden lg:flex lg:fixed lg:inset-y-0 lg:flex-col transition-all duration-300
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
      `}>
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200 dark:border-gray-700/50">
            {isCollapsed ? (
              <div className="mx-auto w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">FB</span>
              </div>
            ) : (
              <Link href="/dashboard" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">FB</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Focus Buddy
                </span>
              </Link>
            )}
          </div>
          
          {/* Collapse Toggle Button */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-20 p-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full shadow-sm hover:shadow-md transition-all"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            )}
          </button>

          <NavContent />
        </div>
      </div>
    </>
  )
}