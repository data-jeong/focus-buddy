'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Trophy, Fire, Target, Sparkles, Star, TrendingUp, 
  Award, Zap, Activity, Timer, Crown, Medal, Rocket
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function AchievementsPage() {
  const [currentMonth] = useState(new Date())
  const [todos, setTodos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(currentMonth)

    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', monthStart.toISOString())
      .lte('created_at', monthEnd.toISOString())

    setTodos(data || [])
    setLoading(false)
  }

  const stats = useMemo(() => {
    const completed = todos.filter(t => t.completed).length
    const total = todos.length
    const totalTime = todos.reduce((acc, t) => acc + (t.total_time_spent || 0), 0)
    const sessions = todos.reduce((acc, t) => acc + (t.session_count || 0), 0)
    const avgTime = sessions > 0 ? Math.round(totalTime / sessions) : 0
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

    // Daily activity
    const dailyActivity: Record<string, number> = {}
    todos.forEach(todo => {
      if (todo.last_worked_at) {
        const day = format(new Date(todo.last_worked_at), 'yyyy-MM-dd')
        dailyActivity[day] = (dailyActivity[day] || 0) + (todo.total_time_spent || 0)
      }
    })

    // 이번 달 활동일수
    const activeDays = Object.keys(dailyActivity).length

    return {
      completed,
      total,
      totalTime,
      sessions,
      avgTime,
      completionRate,
      dailyActivity,
      activeDays,
      avgDailyTime: activeDays > 0 ? Math.round(totalTime / activeDays) : 0
    }
  }, [todos])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) return `${hours}시간 ${minutes}분`
    return `${minutes}분`
  }

  const getMotivationalMessage = () => {
    const hour = new Date().getHours()
    const { completionRate, activeDays, totalTime } = stats

    if (hour < 12) {
      return "🌅 오늘도 화이팅! 멋진 하루를 만들어보세요!"
    } else if (hour < 18) {
      if (completionRate > 70) return "🔥 대단해요! 이 속도라면 곧 목표 달성이에요!"
      if (activeDays > 20) return "💪 꾸준함이 최고의 재능입니다!"
      if (totalTime > 7200) return "⚡ 집중력이 대단하네요! 계속 이어가세요!"
      return "🎯 오후도 힘차게! 할 수 있어요!"
    } else {
      if (completionRate > 50) return "🌟 오늘 하루도 수고했어요! 내일은 더 나은 하루가 될 거예요!"
      return "🌙 오늘 하루 어땠나요? 작은 진전도 큰 성과예요!"
    }
  }

  const getActivityLevel = (time: number) => {
    if (time === 0) return ''
    if (time < 1800) return 'bg-gradient-to-br from-blue-400 to-blue-500'
    if (time < 3600) return 'bg-gradient-to-br from-green-400 to-green-500'
    if (time < 7200) return 'bg-gradient-to-br from-yellow-400 to-yellow-500'
    return 'bg-gradient-to-br from-red-400 to-red-500'
  }

  const achievements = [
    { 
      icon: Fire, 
      title: '🔥 연속 기록', 
      value: `${stats.activeDays}일`,
      desc: '이번 달 활동일',
      color: 'from-orange-400 to-red-500',
      progress: (stats.activeDays / 30) * 100
    },
    { 
      icon: Target, 
      title: '🎯 완료율', 
      value: `${stats.completionRate}%`,
      desc: `${stats.completed}/${stats.total} 완료`,
      color: 'from-blue-400 to-indigo-500',
      progress: stats.completionRate
    },
    { 
      icon: Timer, 
      title: '⏱️ 집중 시간', 
      value: formatTime(stats.totalTime),
      desc: `일평균 ${formatTime(stats.avgDailyTime)}`,
      color: 'from-purple-400 to-pink-500',
      progress: Math.min((stats.totalTime / 36000) * 100, 100)
    },
    { 
      icon: Zap, 
      title: '⚡ 생산성', 
      value: `${stats.sessions}회`,
      desc: `평균 ${formatTime(stats.avgTime)}/세션`,
      color: 'from-green-400 to-teal-500',
      progress: Math.min((stats.sessions / 100) * 100, 100)
    }
  ]

  const badges = [
    { unlocked: stats.completed >= 1, icon: '🎯', title: '첫 완료', desc: '첫 할 일 완료!' },
    { unlocked: stats.completed >= 10, icon: '🔟', title: '10개 달성', desc: '10개 할 일 완료' },
    { unlocked: stats.activeDays >= 7, icon: '📅', title: '일주일 연속', desc: '7일 연속 활동' },
    { unlocked: stats.totalTime >= 3600, icon: '⏰', title: '1시간 집중', desc: '총 1시간 이상 집중' },
    { unlocked: stats.completionRate >= 80, icon: '🏆', title: '우수 달성률', desc: '80% 이상 완료' },
    { unlocked: stats.totalTime >= 36000, icon: '👑', title: '집중 마스터', desc: '10시간 이상 집중' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Sparkles className="h-12 w-12 animate-pulse text-yellow-400 mx-auto mb-4" />
          <p className="text-xl font-bold text-gray-900 dark:text-gray-100">로딩 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Motivational Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-gray-900 dark:text-gray-100 mb-3">
          {format(currentMonth, 'yyyy년 MM월', { locale: ko })}의 성과
        </h1>
        <p className="text-xl text-gray-700 dark:text-gray-300 font-semibold">
          {getMotivationalMessage()}
        </p>
      </div>

      {/* Achievement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {achievements.map((achievement, index) => (
          <div key={index} className="relative group">
            <div className={`absolute inset-0 bg-gradient-to-r ${achievement.color} rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity`} />
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1">
              <div className="text-3xl mb-3">{achievement.title}</div>
              <div className="text-3xl font-black text-gray-900 dark:text-gray-100 mb-2">
                {achievement.value}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 font-medium mb-3">
                {achievement.desc}
              </p>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full bg-gradient-to-r ${achievement.color} transition-all`}
                  style={{ width: `${achievement.progress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Badges Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
          <Medal className="h-7 w-7 mr-3 text-yellow-500" />
          획득한 배지
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {badges.map((badge, index) => (
            <div
              key={index}
              className={`text-center p-4 rounded-xl transition-all ${
                badge.unlocked 
                  ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 transform hover:scale-105' 
                  : 'bg-gray-100 dark:bg-gray-700 opacity-50 grayscale'
              }`}
            >
              <div className="text-3xl mb-2">{badge.icon}</div>
              <p className="text-xs font-bold text-gray-900 dark:text-gray-100">{badge.title}</p>
              <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">{badge.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Heatmap */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center">
          <Activity className="h-7 w-7 mr-3 text-green-500" />
          이번 달 활동
        </h2>
        <div className="grid grid-cols-7 gap-2">
          {['일', '월', '화', '수', '목', '금', '토'].map(day => (
            <div key={day} className="text-center text-xs font-bold text-gray-600 dark:text-gray-400 mb-2">
              {day}
            </div>
          ))}
          {eachDayOfInterval({
            start: startOfMonth(currentMonth),
            end: endOfMonth(currentMonth)
          }).map(day => {
            const dayKey = format(day, 'yyyy-MM-dd')
            const time = stats.dailyActivity[dayKey] || 0
            const isToday = isSameDay(day, new Date())
            const dayOfWeek = getDay(day)
            
            // Add empty cells for the first week
            if (day.getDate() === 1 && dayOfWeek > 0) {
              const emptyCells = Array.from({ length: dayOfWeek }, (_, i) => (
                <div key={`empty-${i}`} className="aspect-square" />
              ))
              return [
                ...emptyCells,
                <div
                  key={dayKey}
                  className={`aspect-square rounded-lg flex items-center justify-center relative group cursor-pointer transition-all ${
                    time > 0 ? getActivityLevel(time) : 'bg-gray-100 dark:bg-gray-700'
                  } ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''} hover:scale-110`}
                >
                  <span className={`text-xs font-bold ${time > 0 ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                    {day.getDate()}
                  </span>
                  {time > 0 && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {formatTime(time)}
                    </div>
                  )}
                </div>
              ]
            }
            
            return (
              <div
                key={dayKey}
                className={`aspect-square rounded-lg flex items-center justify-center relative group cursor-pointer transition-all ${
                  time > 0 ? getActivityLevel(time) : 'bg-gray-100 dark:bg-gray-700'
                } ${isToday ? 'ring-2 ring-blue-500 ring-offset-2' : ''} hover:scale-110`}
              >
                <span className={`text-xs font-bold ${time > 0 ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
                  {day.getDate()}
                </span>
                {time > 0 && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {formatTime(time)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}