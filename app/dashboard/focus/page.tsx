'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, Settings, Target, Clock, Coffee } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const FOCUS_MODES = [
  { id: 'pomodoro', name: '뽀모도로', focusTime: 25, breakTime: 5, icon: Clock },
  { id: 'deep', name: '딥 포커스', focusTime: 50, breakTime: 10, icon: Target },
  { id: 'custom', name: '사용자 설정', focusTime: 30, breakTime: 5, icon: Settings },
]

export default function FocusPage() {
  const [selectedMode, setSelectedMode] = useState(FOCUS_MODES[0])
  const [customFocusTime, setCustomFocusTime] = useState(30)
  const [customBreakTime, setCustomBreakTime] = useState(5)
  const [isRunning, setIsRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [timeLeft, setTimeLeft] = useState(selectedMode.focusTime * 60)
  const [completedSessions, setCompletedSessions] = useState(0)
  const [totalFocusTime, setTotalFocusTime] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const supabase = createClient()

  useEffect(() => {
    // Initialize audio for notifications
    audioRef.current = new Audio('/notification.mp3')
    
    // Load saved stats
    loadStats()
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (selectedMode.id === 'custom') {
      setTimeLeft(customFocusTime * 60)
    } else {
      setTimeLeft(selectedMode.focusTime * 60)
    }
  }, [selectedMode, customFocusTime])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            handleTimerComplete()
            return 0
          }
          return prevTime - 1
        })
      }, 1000)
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isRunning, isBreak])

  const loadStats = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', user.id)
      .gte('created_at', today.toISOString())

    if (data) {
      setCompletedSessions(data.length)
      const total = data.reduce((acc, session) => acc + (session.duration || 0), 0)
      setTotalFocusTime(Math.floor(total / 60))
    }
  }

  const handleTimerComplete = async () => {
    setIsRunning(false)
    
    // Play notification sound
    if (audioRef.current) {
      audioRef.current.play().catch(e => console.log('Audio play failed:', e))
    }

    // Send notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(isBreak ? '휴식 시간 종료!' : '포커스 세션 완료!', {
        body: isBreak ? '다시 집중할 시간입니다.' : '잠시 휴식을 취하세요.',
        icon: '/icon-192x192.png',
      })
    }

    if (!isBreak) {
      // Save focus session
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const duration = selectedMode.id === 'custom' 
          ? customFocusTime 
          : selectedMode.focusTime

        await supabase.from('focus_sessions').insert([{
          user_id: user.id,
          duration: duration,
          mode: selectedMode.id,
        }])

        setCompletedSessions(prev => prev + 1)
        setTotalFocusTime(prev => prev + duration)
      }

      // Switch to break
      setIsBreak(true)
      const breakTime = selectedMode.id === 'custom' 
        ? customBreakTime 
        : selectedMode.breakTime
      setTimeLeft(breakTime * 60)
      setIsRunning(true)
      
      toast.success('포커스 세션 완료! 휴식 시간입니다.')
    } else {
      // Switch back to focus
      setIsBreak(false)
      const focusTime = selectedMode.id === 'custom' 
        ? customFocusTime 
        : selectedMode.focusTime
      setTimeLeft(focusTime * 60)
      
      toast.success('휴식 완료! 다시 집중할 시간입니다.')
    }
  }

  const handleStart = () => {
    setIsRunning(true)
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setIsBreak(false)
    const focusTime = selectedMode.id === 'custom' 
      ? customFocusTime 
      : selectedMode.focusTime
    setTimeLeft(focusTime * 60)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = isBreak
    ? ((selectedMode.id === 'custom' ? customBreakTime : selectedMode.breakTime) * 60 - timeLeft) / 
      ((selectedMode.id === 'custom' ? customBreakTime : selectedMode.breakTime) * 60) * 100
    : ((selectedMode.id === 'custom' ? customFocusTime : selectedMode.focusTime) * 60 - timeLeft) / 
      ((selectedMode.id === 'custom' ? customFocusTime : selectedMode.focusTime) * 60) * 100

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">포커스 모드</h1>

      {/* Mode Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">모드 선택</h2>
        <div className="grid grid-cols-3 gap-4">
          {FOCUS_MODES.map((mode) => {
            const Icon = mode.icon
            return (
              <button
                key={mode.id}
                onClick={() => {
                  setSelectedMode(mode)
                  handleReset()
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedMode.id === mode.id
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <Icon className="h-8 w-8 mx-auto mb-2 text-gray-600 dark:text-gray-400" />
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{mode.name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {mode.focusTime}분 / {mode.breakTime}분 휴식
                </div>
              </button>
            )
          })}
        </div>

        {selectedMode.id === 'custom' && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  포커스 시간 (분)
                </label>
                <input
                  type="number"
                  value={customFocusTime}
                  onChange={(e) => setCustomFocusTime(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  min="1"
                  max="120"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  휴식 시간 (분)
                </label>
                <input
                  type="number"
                  value={customBreakTime}
                  onChange={(e) => setCustomBreakTime(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  min="1"
                  max="30"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Timer */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center">
            {/* Progress Ring */}
            <svg className="transform -rotate-90 w-64 h-64">
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="128"
                cy="128"
                r="120"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 120}`}
                strokeDashoffset={`${2 * Math.PI * 120 * (1 - progress / 100)}`}
                className={`transition-all duration-1000 ${
                  isBreak 
                    ? 'text-green-500' 
                    : 'text-indigo-600'
                }`}
              />
            </svg>
            
            {/* Timer Display */}
            <div className="absolute">
              <div className="text-5xl font-bold text-gray-900 dark:text-gray-100">
                {formatTime(timeLeft)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {isBreak ? (
                  <span className="flex items-center justify-center">
                    <Coffee className="h-4 w-4 mr-1" />
                    휴식 시간
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <Target className="h-4 w-4 mr-1" />
                    포커스 시간
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center space-x-4 mt-8">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Play className="h-5 w-5" />
                <span>시작</span>
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex items-center space-x-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                <Pause className="h-5 w-5" />
                <span>일시정지</span>
              </button>
            )}
            <button
              onClick={handleReset}
              className="flex items-center space-x-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <RotateCcw className="h-5 w-5" />
              <span>리셋</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">오늘 완료한 세션</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {completedSessions}개
              </p>
            </div>
            <Target className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">총 포커스 시간</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                {totalFocusTime}분
              </p>
            </div>
            <Clock className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
        </div>
      </div>
    </div>
  )
}