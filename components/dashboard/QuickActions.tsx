'use client'

import { Plus, Calendar, CheckSquare, Clock, Target, TrendingUp } from 'lucide-react'
import { useState, useEffect } from 'react'
import TodoModal from '@/components/modals/TodoModal'
import ScheduleModal from '@/components/modals/ScheduleModal'
import { createClient } from '@/lib/supabase/client'
import { cardStyles, headerStyles, textStyles } from '@/lib/constants/styles'

export default function QuickActions() {
  const [todoModalOpen, setTodoModalOpen] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [stats, setStats] = useState({ todayTodos: 0, todaySchedules: 0, completedToday: 0 })
  const supabase = createClient()

  useEffect(() => {
    fetchStats()
    
    // Set up realtime subscriptions for both todos and schedules
    const todosChannel = supabase
      .channel('quickactions-todos')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
        },
        () => {
          fetchStats() // Re-fetch stats when todos change
        }
      )
      .subscribe()
    
    const schedulesChannel = supabase
      .channel('quickactions-schedules')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules',
        },
        () => {
          fetchStats() // Re-fetch stats when schedules change
        }
      )
      .subscribe()
    
    return () => {
      supabase.removeChannel(todosChannel)
      supabase.removeChannel(schedulesChannel)
    }
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
        .select('*')
        .eq('user_id', user.id),
      supabase
        .from('todos')
        .select('id', { count: 'exact' })
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('updated_at', todayStart.toISOString())
    ])

    // Count today's schedules properly including recurring ones
    let todayScheduleCount = 0
    if (schedulesRes.data) {
      schedulesRes.data.forEach(schedule => {
        const startTime = new Date(schedule.start_time)
        
        if (schedule.recurrence && schedule.recurrence !== 'none') {
          // Check if this recurring schedule happens today
          const shouldOccurToday = () => {
            const today = new Date()
            const dayOfWeek = today.getDay()
            
            switch (schedule.recurrence) {
              case 'daily':
                return true
              case 'weekdays':
                return dayOfWeek >= 1 && dayOfWeek <= 5
              case 'weekends':
                return dayOfWeek === 0 || dayOfWeek === 6
              case 'weekly':
                return dayOfWeek === startTime.getDay()
              case 'monthly':
                return today.getDate() === startTime.getDate()
              case 'yearly':
                return today.getMonth() === startTime.getMonth() && today.getDate() === startTime.getDate()
              default:
                return false
            }
          }
          
          if (shouldOccurToday()) {
            todayScheduleCount++
          }
        } else if (startTime >= todayStart && startTime <= todayEnd) {
          todayScheduleCount++
        }
      })
    }

    setStats({
      todayTodos: todosRes.count || 0,
      todaySchedules: todayScheduleCount,
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
      <div className={cardStyles.full}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={headerStyles.widget}>빠른 실행</h2>
          <div className={`flex items-center ${textStyles.small}`}>
            <Clock className="h-4 w-4 mr-1" />
            <span>생산성 도구</span>
          </div>
        </div>

        <div className="space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-3">
            {quickStats.map((stat, index) => {
              const Icon = stat.icon
              return (
                <div
                  key={index}
                  className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{stat.label}</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</p>
                    </div>
                    <div className={`p-2 rounded-lg ${stat.bg}`}>
                      <Icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {actions.map((action, index) => {
              const Icon = action.icon
              return (
                <button
                  key={index}
                  onClick={action.onClick}
                  className={`relative overflow-hidden bg-gradient-to-br ${action.gradient} ${action.hoverGradient} text-white rounded-lg p-4 transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg group`}
                >
                  <div className="relative z-10">
                    <div className={`inline-flex p-2 rounded-lg ${action.iconBg} mb-2`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold mb-0.5">{action.label}</p>
                    <p className="text-xs opacity-90">{action.description}</p>
                  </div>
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                </button>
              )
            })}
          </div>
        </div>
      </div>
      
      <TodoModal 
        open={todoModalOpen} 
        onClose={() => setTodoModalOpen(false)} 
      />
      <ScheduleModal 
        open={scheduleModalOpen} 
        onClose={() => setScheduleModalOpen(false)} 
      />
    </>
  )
}