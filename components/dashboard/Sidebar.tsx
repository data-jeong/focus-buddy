'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Calendar, CheckSquare, Settings, Bell, BarChart3, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: BarChart3 },
  { name: '할 일', href: '/dashboard/todos', icon: CheckSquare },
  { name: '시간표', href: '/dashboard/schedule', icon: Calendar },
  { name: '알림', href: '/dashboard/notifications', icon: Bell },
  { name: '설정', href: '/dashboard/settings', icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex flex-col flex-grow bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
        <div className="flex items-center flex-shrink-0 px-6 py-4">
          <Link href="/dashboard" className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
            Focus Buddy
          </Link>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  group flex items-center px-3 py-2 text-sm font-medium rounded-lg
                  ${
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }
                `}
              >
                <Icon
                  className={`
                    mr-3 h-5 w-5
                    ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'}
                  `}
                />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSignOut}
            className="group flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 w-full"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400" />
            로그아웃
          </button>
        </div>
      </div>
    </div>
  )
}