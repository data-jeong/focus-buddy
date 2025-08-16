'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Trophy, Target, Clock, Calendar, TrendingUp, Award, 
  BarChart3, CheckCircle, Zap, Star, Activity, Timer
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, addMonths } from 'date-fns'
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
    weeklyFocus: [],
    topTasks: [],
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
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 })
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 0 })

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

    const { data: weeklyTodos } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .gte('last_worked_at', weekStart.toISOString())
      .lte('last_worked_at', weekEnd.toISOString())

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

    // Get top tasks by time spent
    const topTasks = (monthlyTodos || [])
      .filter(t => t.total_time_spent > 0)
      .sort((a, b) => (b.total_time_spent || 0) - (a.total_time_spent || 0))
      .slice(0, 5)
      .map(t => ({
        title: t.title,
        time: t.total_time_spent || 0,
        sessions: t.session_count || 0,
        completed: t.completed,
      }))

    // Calculate weekly focus distribution
    const weeklyFocus = []
    const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토']
    for (let i = 0; i < 7; i++) {
      const dayTodos = weeklyTodos?.filter(t => {
        if (!t.last_worked_at) return false
        const day = new Date(t.last_worked_at).getDay()
        return day === i
      }) || []
      
      weeklyFocus.push({
        day: daysOfWeek[i],
        time: dayTodos.reduce((acc, t) => acc + (t.total_time_spent || 0), 0),
      })
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
      longestStreak: 7, // Simplified for now
      monthlyProgress,
      weeklyFocus,
      topTasks,
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 flex items-center">
          <Trophy className="h-8 w-8 mr-3 text-yellow-500" />
          나의 업적
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          {format(currentMonth, 'yyyy년 MM월', { locale: ko })}의 성과를 확인하세요
        </p>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          이전 달
        </button>
        <span className="text-lg font-medium text-gray-900 dark:text-white">
          {format(currentMonth, 'yyyy년 MM월', { locale: ko })}
        </span>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
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

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Progress Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
            월간 진행 상황
          </h3>
          <div className="space-y-3">
            {stats.monthlyProgress.map((month: any, index: number) => (
              <div key={index}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-gray-600 dark:text-gray-400">{month.month}</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {month.completed}개 완료
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min((month.completed / 30) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Weekly Focus Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
            <Activity className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
            주간 집중 분포
          </h3>
          <div className="flex items-end justify-between h-32 mt-4">
            {stats.weeklyFocus.map((day: any, index: number) => {
              const maxTime = Math.max(...stats.weeklyFocus.map((d: any) => d.time), 1)
              const height = (day.time / maxTime) * 100
              
              return (
                <div key={index} className="flex flex-col items-center flex-1">
                  <div className="relative w-full flex justify-center">
                    <div
                      className="w-8 bg-gradient-to-t from-green-500 to-green-400 rounded-t transition-all"
                      style={{ height: `${height}px` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                    {day.day}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top Tasks */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Star className="h-5 w-5 mr-2 text-yellow-500" />
          이번 달 주요 작업
        </h3>
        {stats.topTasks.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            아직 작업 기록이 없습니다
          </p>
        ) : (
          <div className="space-y-3">
            {stats.topTasks.map((task: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    index === 2 ? 'bg-orange-600' :
                    'bg-gray-600'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {task.title}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {task.sessions}개 세션
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatTime(task.time)}
                  </p>
                  {task.completed && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      완료됨
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Achievement Badges */}
      <div className="mt-8 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-indigo-200 dark:border-indigo-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
          <Award className="h-5 w-5 mr-2 text-indigo-600 dark:text-indigo-400" />
          획득한 배지
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.completedTodos >= 10 && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mb-2">
                <CheckCircle className="h-8 w-8 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">첫 10개 완료</p>
            </div>
          )}
          {stats.totalTimeSpent >= 3600 && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center mb-2">
                <Timer className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">1시간 달성</p>
            </div>
          )}
          {stats.totalSessions >= 5 && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mb-2">
                <Target className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">5세션 완료</p>
            </div>
          )}
          {completionRate >= 80 && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center mb-2">
                <Trophy className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">80% 달성</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}