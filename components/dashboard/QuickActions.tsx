'use client'

import { Plus, Calendar, CheckSquare, Clock, Target, TrendingUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import TodoModal from '@/components/modals/TodoModal'
import ScheduleModal from '@/components/modals/ScheduleModal'
import { createClient } from '@/lib/supabase/client'

export default function QuickActions() {
  const [todoModalOpen, setTodoModalOpen] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [stats, setStats] = useState({ todayTodos: 0, todaySchedules: 0, completedToday: 0 })
  const supabase = createClient()

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const [todosRes, schedulesRes, completedRes] = await Promise.all([
      supabase
        .from('todos')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('completed', false),
      supabase
        .from('schedules')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .gte('start_time', todayStart.toISOString())
        .lte('start_time', todayEnd.toISOString()),
      supabase
        .from('todos')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('updated_at', todayStart.toISOString())
    ])

    setStats({
      todayTodos: todosRes.count || 0,
      todaySchedules: schedulesRes.count || 0,
      completedToday: completedRes.count || 0
    })
  }

  const actions = [
    {
      icon: CheckSquare,
      label: '할 일 추가',
      description: `${stats.todayTodos}개 진행중`,
      onClick: () => setTodoModalOpen(true),
      gradient: 'from-primary-500 to-primary-600',
      hoverGradient: 'hover:from-primary-600 hover:to-primary-700',
      iconBg: 'bg-primary-400/20',
    },
    {
      icon: Calendar,
      label: '일정 추가',
      description: `오늘 ${stats.todaySchedules}개`,
      onClick: () => setScheduleModalOpen(true),
      gradient: 'from-success-500 to-success-600',
      hoverGradient: 'hover:from-success-600 hover:to-success-700',
      iconBg: 'bg-success-400/20',
    },
  ]

  const quickStats = [
    {
      icon: Target,
      label: '오늘 완료',
      value: stats.completedToday,
      color: 'text-warning-600 dark:text-warning-400',
      bg: 'bg-warning-100 dark:bg-warning-900/30',
    },
    {
      icon: TrendingUp,
      label: '진행률',
      value: stats.todayTodos > 0 
        ? `${Math.round((stats.completedToday / (stats.completedToday + stats.todayTodos)) * 100)}%`
        : '0%',
      color: 'text-info-600 dark:text-info-400',
      bg: 'bg-info-100 dark:bg-info-900/30',
    },
  ]

  return (
    <>
      <div className="space-y-4">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          {quickStats.map((stat, index) => {
            const Icon = stat.icon
            return (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${stat.bg}`}>
                    <Icon className={`h-5 w-5 ${stat.color}`} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-4">
          {actions.map((action, index) => {
            const Icon = action.icon
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`relative overflow-hidden bg-gradient-to-br ${action.gradient} ${action.hoverGradient} text-white rounded-xl p-5 transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg group`}
              >
                <div className="relative z-10">
                  <div className={`inline-flex p-3 rounded-lg ${action.iconBg} mb-3`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="text-base font-semibold mb-1">{action.label}</p>
                  <p className="text-sm opacity-90">{action.description}</p>
                </div>
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
              </button>
            )
          })}
        </div>
      </div>
      
      <TodoModal open={todoModalOpen} onClose={() => setTodoModalOpen(false)} />
      <ScheduleModal open={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} />
    </>
  )
}