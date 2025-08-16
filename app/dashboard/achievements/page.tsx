'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Trophy, Target, Clock, Calendar, TrendingUp, 
  BarChart3, CheckCircle, Zap, Star, Activity, Timer, Flag
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, addMonths, eachDayOfInterval, isSameDay } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function AchievementsPage() {
  const [stats, setStats] = useState<any>({
    totalTodos: 0,
    completedTodos: 0,
    totalTimeSpent: 0,
    averageSessionTime: 0,
    totalSessions: 0,
    currentStreak: 0,
    longestStreak: 0,
    monthlyProgress: [],
    dailyActivity: {},
    topTasksByPriority: {
      high: [],
      medium: [],
      low: []
    },
  })
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchStats()
  }, [currentMonth])

  const fetchStats = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)

    // Fetch todos statistics
    const { data: allTodos } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)

    const { data: monthlyTodos } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())

    // Calculate statistics
    const totalTodos = allTodos?.length || 0
    const completedTodos = allTodos?.filter(t => t.completed).length || 0
    const totalTimeSpent = allTodos?.reduce((acc, todo) => acc + (todo.total_time_spent || 0), 0) || 0
    const totalSessions = allTodos?.reduce((acc, todo) => acc + (todo.session_count || 0), 0) || 0
    const averageSessionTime = totalSessions > 0 ? Math.round(totalTimeSpent / totalSessions) : 0

    // Calculate monthly progress (last 6 months)
    const monthlyProgress = []
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(currentMonth, i)
      const start = startOfMonth(month)
      const end = endOfMonth(month)
      
      const { data: monthData } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', true)
        .gte('updated_at', start.toISOString())
        .lte('updated_at', end.toISOString())

      monthlyProgress.push({
        month: format(month, 'MMM', { locale: ko }),
        completed: monthData?.length || 0,
        time: monthData?.reduce((acc, t) => acc + (t.total_time_spent || 0), 0) || 0,
      })
    }

    // Calculate daily activity for GitHub-style grass
    const dailyActivity: any = {}
    const allDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
    
    for (const day of allDays) {
      const dayStart = new Date(day)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(day)
      dayEnd.setHours(23, 59, 59, 999)
      
      const { data: dayTodos } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .gte('last_worked_at', dayStart.toISOString())
        .lte('last_worked_at', dayEnd.toISOString())
      
      const dayKey = format(day, 'yyyy-MM-dd')
      const dayTime = dayTodos?.reduce((acc, t) => acc + (t.total_time_spent || 0), 0) || 0
      dailyActivity[dayKey] = {
        time: dayTime,
        count: dayTodos?.length || 0,
        completed: dayTodos?.filter(t => t.completed).length || 0
      }
    }

    // Get tasks by priority
    const topTasksByPriority = {
      high: (monthlyTodos || [])
        .filter(t => t.priority === 'high' && t.total_time_spent > 0)
        .sort((a, b) => (b.total_time_spent || 0) - (a.total_time_spent || 0))
        .slice(0, 5)
        .map(t => ({
          title: t.title,
          time: t.total_time_spent || 0,
          sessions: t.session_count || 0,
          completed: t.completed,
        })),
      medium: (monthlyTodos || [])
        .filter(t => t.priority === 'medium' && t.total_time_spent > 0)
        .sort((a, b) => (b.total_time_spent || 0) - (a.total_time_spent || 0))
        .slice(0, 5)
        .map(t => ({
          title: t.title,
          time: t.total_time_spent || 0,
          sessions: t.session_count || 0,
          completed: t.completed,
        })),
      low: (monthlyTodos || [])
        .filter(t => t.priority === 'low' && t.total_time_spent > 0)
        .sort((a, b) => (b.total_time_spent || 0) - (a.total_time_spent || 0))
        .slice(0, 5)
        .map(t => ({
          title: t.title,
          time: t.total_time_spent || 0,
          sessions: t.session_count || 0,
          completed: t.completed,
        }))
    }

    // Calculate streaks (simplified)
    const todayCompleted = allTodos?.filter(t => {
      if (!t.updated_at || !t.completed) return false
      const today = new Date()
      const updated = new Date(t.updated_at)
      return updated.toDateString() === today.toDateString()
    }).length || 0

    setStats({
      totalTodos,
      completedTodos,
      totalTimeSpent,
      averageSessionTime,
      totalSessions,
      currentStreak: todayCompleted > 0 ? 1 : 0,
      longestStreak: 7,
      monthlyProgress,
      dailyActivity,
      topTasksByPriority,
    })

    setLoading(false)
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return `${hours}시간 ${minutes}분`
    }
    return `${minutes}분`
  }

  const getActivityLevel = (time: number) => {
    if (time === 0) return 'bg-gray-100 dark:bg-gray-800'
    if (time < 1800) return 'bg-green-200 dark:bg-green-900/50'  // < 30 min
    if (time < 3600) return 'bg-green-400 dark:bg-green-700'     // < 1 hour
    if (time < 7200) return 'bg-green-500 dark:bg-green-600'     // < 2 hours
    return 'bg-green-600 dark:bg-green-500'                       // >= 2 hours
  }

  const completionRate = stats.totalTodos > 0 
    ? Math.round((stats.completedTodos / stats.totalTodos) * 100) 
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Trophy className="h-8 w-8 animate-pulse text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-400">업적 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
          <Trophy className="h-8 w-8 mr-3 text-yellow-500" />
          나의 업적
        </h1>
        <p className="text-gray-300">
          {format(currentMonth, 'yyyy년 MM월', { locale: ko })}의 성과를 확인하세요
        </p>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
        >
          이전 달
        </button>
        <span className="text-lg font-medium text-white">
          {format(currentMonth, 'yyyy년 MM월', { locale: ko })}
        </span>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
        >
          다음 달
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between mb-4">
            <CheckCircle className="h-8 w-8 opacity-80" />
            <span className="text-2xl font-bold">{completionRate}%</span>
          </div>
          <h3 className="font-semibold">완료율</h3>
          <p className="text-sm opacity-90 mt-1">
            {stats.completedTodos}/{stats.totalTodos} 완료
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between mb-4">
            <Clock className="h-8 w-8 opacity-80" />
            <span className="text-2xl font-bold">{Math.floor(stats.totalTimeSpent / 3600)}h</span>
          </div>
          <h3 className="font-semibold">총 집중 시간</h3>
          <p className="text-sm opacity-90 mt-1">
            {formatTime(stats.totalTimeSpent)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between mb-4">
            <Target className="h-8 w-8 opacity-80" />
            <span className="text-2xl font-bold">{stats.totalSessions}</span>
          </div>
          <h3 className="font-semibold">총 세션</h3>
          <p className="text-sm opacity-90 mt-1">
            평균 {formatTime(stats.averageSessionTime)}/세션
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 p-6 rounded-xl text-white">
          <div className="flex items-center justify-between mb-4">
            <Zap className="h-8 w-8 opacity-80" />
            <span className="text-2xl font-bold">{stats.currentStreak}</span>
          </div>
          <h3 className="font-semibold">현재 연속</h3>
          <p className="text-sm opacity-90 mt-1">
            최고 {stats.longestStreak}일 연속
          </p>
        </div>
      </div>

      {/* GitHub-style Activity Graph */}
      <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6 mb-8">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-green-400" />
          활동 기록
        </h3>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-7 gap-1 min-w-[300px]">
            {['일', '월', '화', '수', '목', '금', '토'].map((day) => (
              <div key={day} className="text-xs text-gray-400 text-center mb-1">
                {day}
              </div>
            ))}
            {eachDayOfInterval({ 
              start: startOfMonth(currentMonth), 
              end: endOfMonth(currentMonth) 
            }).map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd')
              const dayData = stats.dailyActivity[dayKey] || { time: 0, count: 0 }
              const isToday = isSameDay(day, new Date())
              
              return (
                <div
                  key={dayKey}
                  className={`aspect-square rounded-sm ${getActivityLevel(dayData.time)} ${
                    isToday ? 'ring-2 ring-blue-400' : ''
                  } relative group cursor-pointer`}
                  title={`${format(day, 'MM월 dd일')}: ${formatTime(dayData.time)}`}
                >
                  {dayData.count > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      {dayData.count}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-end mt-4 space-x-2">
            <span className="text-xs text-gray-400">적음</span>
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-gray-100 dark:bg-gray-800 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-200 dark:bg-green-900/50 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-400 dark:bg-green-700 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-500 dark:bg-green-600 rounded-sm"></div>
              <div className="w-3 h-3 bg-green-600 dark:bg-green-500 rounded-sm"></div>
            </div>
            <span className="text-xs text-gray-400">많음</span>
          </div>
        </div>
      </div>

      {/* Tasks by Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* High Priority Tasks */}
        <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Flag className="h-5 w-5 mr-2 text-red-500" />
            높은 우선순위
          </h3>
          {stats.topTasksByPriority.high.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">
              높은 우선순위 작업이 없습니다
            </p>
          ) : (
            <div className="space-y-3">
              {stats.topTasksByPriority.high.map((task: any, index: number) => (
                <div
                  key={index}
                  className="p-3 bg-gray-700/50 rounded-lg"
                >
                  <p className="font-medium text-white text-sm truncate">
                    {task.title}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">
                      {formatTime(task.time)}
                    </span>
                    {task.completed && (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Medium Priority Tasks */}
        <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Flag className="h-5 w-5 mr-2 text-yellow-500" />
            보통 우선순위
          </h3>
          {stats.topTasksByPriority.medium.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">
              보통 우선순위 작업이 없습니다
            </p>
          ) : (
            <div className="space-y-3">
              {stats.topTasksByPriority.medium.map((task: any, index: number) => (
                <div
                  key={index}
                  className="p-3 bg-gray-700/50 rounded-lg"
                >
                  <p className="font-medium text-white text-sm truncate">
                    {task.title}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">
                      {formatTime(task.time)}
                    </span>
                    {task.completed && (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Priority Tasks */}
        <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Flag className="h-5 w-5 mr-2 text-green-500" />
            낮은 우선순위
          </h3>
          {stats.topTasksByPriority.low.length === 0 ? (
            <p className="text-gray-400 text-center py-8 text-sm">
              낮은 우선순위 작업이 없습니다
            </p>
          ) : (
            <div className="space-y-3">
              {stats.topTasksByPriority.low.map((task: any, index: number) => (
                <div
                  key={index}
                  className="p-3 bg-gray-700/50 rounded-lg"
                >
                  <p className="font-medium text-white text-sm truncate">
                    {task.title}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs text-gray-400">
                      {formatTime(task.time)}
                    </span>
                    {task.completed && (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monthly Progress */}
      <div className="bg-gray-800 rounded-xl shadow-sm border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-indigo-400" />
          월간 진행 추이
        </h3>
        <div className="space-y-3">
          {stats.monthlyProgress.map((month: any, index: number) => (
            <div key={index}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-400">{month.month}</span>
                <span className="text-white font-medium">
                  {month.completed}개 완료 · {formatTime(month.time)}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-indigo-500 h-2 rounded-full transition-all"
                  style={{ width: `${Math.min((month.completed / 30) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}