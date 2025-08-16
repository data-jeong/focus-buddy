'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, CheckCircle, Clock, Target, Coffee, SkipForward } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

const FOCUS_MODES = [
  { id: 'pomodoro', name: '뽀모도로', focusTime: 25, breakTime: 5 },
  { id: 'short', name: '짧은 집중', focusTime: 15, breakTime: 3 },
  { id: 'long', name: '긴 집중', focusTime: 50, breakTime: 10 },
]

export default function CurrentTask() {
  const [currentTask, setCurrentTask] = useState<any>(null)
  const [todos, setTodos] = useState<any[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [focusMode, setFocusMode] = useState(FOCUS_MODES[0])
  const [timeLeft, setTimeLeft] = useState(focusMode.focusTime * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [totalFocusTime, setTotalFocusTime] = useState(0)
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchTodos()
    
    // Subscribe to todos changes
    const channel = supabase
      .channel('todos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
        },
        () => {
          fetchTodos()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isBreak) {
      setTimeLeft(focusMode.focusTime * 60)
    }
  }, [focusMode])

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete()
            return 0
          }
          return prev - 1
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

  const fetchTodos = async () => {
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('completed', false)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
    
    setTodos(data || [])
    
    // Auto-select first high priority task if no task selected
    if (!selectedTaskId && data && data.length > 0) {
      const highPriorityTask = data.find(t => t.priority === 'high') || data[0]
      setSelectedTaskId(highPriorityTask.id)
      setCurrentTask(highPriorityTask)
    } else if (selectedTaskId) {
      const task = data?.find(t => t.id === selectedTaskId)
      if (task) {
        setCurrentTask(task)
      } else {
        // Task was deleted or completed
        const newTask = data && data.length > 0 ? data[0] : null
        setSelectedTaskId(newTask?.id || null)
        setCurrentTask(newTask)
      }
    }
  }

  const handleTimerComplete = () => {
    setIsRunning(false)
    
    // Play notification sound
    const audio = new Audio('/notification.mp3')
    audio.play().catch(e => console.log('Audio play failed:', e))
    
    if (!isBreak) {
      // Focus session completed
      setTotalFocusTime(prev => prev + focusMode.focusTime)
      setSessionsCompleted(prev => prev + 1)
      
      toast.success('포커스 세션 완료! 잠시 휴식하세요.', {
        duration: 5000,
        icon: '🎉'
      })
      
      // Start break
      setIsBreak(true)
      setTimeLeft(focusMode.breakTime * 60)
      setIsRunning(true)
    } else {
      // Break completed
      toast.success('휴식 완료! 다시 집중할 시간입니다.', {
        duration: 5000,
        icon: '💪'
      })
      
      setIsBreak(false)
      setTimeLeft(focusMode.focusTime * 60)
    }
  }

  const handleStart = () => {
    if (!currentTask) {
      toast.error('먼저 작업을 선택해주세요')
      return
    }
    setIsRunning(true)
  }

  const handlePause = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setIsBreak(false)
    setTimeLeft(focusMode.focusTime * 60)
  }

  const handleComplete = async () => {
    if (!currentTask) return
    
    await supabase
      .from('todos')
      .update({ completed: true })
      .eq('id', currentTask.id)
    
    toast.success('작업 완료! 🎉')
    setIsRunning(false)
    setIsBreak(false)
    setTimeLeft(focusMode.focusTime * 60)
  }

  const handleTaskSelect = (taskId: string) => {
    const task = todos.find(t => t.id === taskId)
    if (task) {
      setSelectedTaskId(taskId)
      setCurrentTask(task)
      setIsRunning(false)
      setIsBreak(false)
      setTimeLeft(focusMode.focusTime * 60)
    }
  }

  const handleSkipBreak = () => {
    setIsBreak(false)
    setTimeLeft(focusMode.focusTime * 60)
    setIsRunning(false)
    toast.success('휴식을 건너뛰었습니다')
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = isBreak
    ? ((focusMode.breakTime * 60 - timeLeft) / (focusMode.breakTime * 60)) * 100
    : ((focusMode.focusTime * 60 - timeLeft) / (focusMode.focusTime * 60)) * 100

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">포커스 타이머</h2>
        <div className="flex items-center space-x-2">
          <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            오늘 {sessionsCompleted}개 세션 | 총 {totalFocusTime}분
          </span>
        </div>
      </div>

      {/* Task Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          작업 선택
        </label>
        <select
          value={selectedTaskId || ''}
          onChange={(e) => handleTaskSelect(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="">작업을 선택하세요</option>
          {todos.map((todo) => (
            <option key={todo.id} value={todo.id}>
              [{todo.priority === 'high' ? '높음' : todo.priority === 'medium' ? '보통' : '낮음'}] {todo.title}
            </option>
          ))}
        </select>
      </div>

      {/* Focus Mode Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          집중 모드
        </label>
        <div className="grid grid-cols-3 gap-2">
          {FOCUS_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => {
                setFocusMode(mode)
                if (!isRunning && !isBreak) {
                  setTimeLeft(mode.focusTime * 60)
                }
              }}
              disabled={isRunning}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                focusMode.id === mode.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div>{mode.name}</div>
              <div className="text-xs opacity-80">{mode.focusTime}분</div>
            </button>
          ))}
        </div>
      </div>

      {/* Timer Display */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex-1">
          {currentTask && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {currentTask.title}
              </h3>
              {currentTask.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {currentTask.description}
                </p>
              )}
            </div>
          )}
          
          {/* Progress Bar */}
          <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`absolute top-0 left-0 h-full transition-all duration-1000 ${
                isBreak ? 'bg-green-500' : 'bg-indigo-600'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="text-center ml-6">
          <div className="text-4xl font-bold text-gray-900 dark:text-gray-100 font-mono">
            {formatTime(timeLeft)}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isBreak ? (
              <span className="flex items-center justify-center">
                <Coffee className="h-4 w-4 mr-1" />
                휴식 시간
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <Clock className="h-4 w-4 mr-1" />
                집중 시간
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center space-x-3">
        {!isRunning ? (
          <button
            onClick={handleStart}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Play className="h-4 w-4" />
            <span>시작</span>
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
          >
            <Pause className="h-4 w-4" />
            <span>일시정지</span>
          </button>
        )}
        
        <button
          onClick={handleReset}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          <RotateCcw className="h-4 w-4" />
          <span>리셋</span>
        </button>
        
        {isBreak && (
          <button
            onClick={handleSkipBreak}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <SkipForward className="h-4 w-4" />
            <span>휴식 건너뛰기</span>
          </button>
        )}
        
        {currentTask && !isBreak && (
          <button
            onClick={handleComplete}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <CheckCircle className="h-4 w-4" />
            <span>완료</span>
          </button>
        )}
      </div>
    </div>
  )
}