'use client'

import { useState, useEffect, useRef } from 'react'
import { Play, Pause, RotateCcw, CheckCircle, Clock, Target, Coffee, SkipForward, Timer, TrendingUp, Calendar } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { cardStyles, headerStyles, inputStyles, textStyles } from '@/lib/constants/styles'

const FOCUS_MODES = [
  { id: 'pomodoro', name: '뽀모도로', focusTime: 25, breakTime: 5 },
  { id: 'short', name: '짧은 집중', focusTime: 15, breakTime: 3 },
  { id: 'long', name: '긴 집중', focusTime: 50, breakTime: 10 },
]

interface Todo {
  id: string
  title: string
  description?: string
  priority: string
  completed: boolean
  due_date?: string
  total_time_spent?: number
  last_session_time?: number
  session_count?: number
  last_worked_at?: string
  created_at?: string
  updated_at?: string
}

export default function CurrentTask() {
  const [currentTask, setCurrentTask] = useState<Todo | null>(null)
  const [todos, setTodos] = useState<Todo[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [focusMode, setFocusMode] = useState(FOCUS_MODES[0])
  const [timeLeft, setTimeLeft] = useState(focusMode.focusTime * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [isBreak, setIsBreak] = useState(false)
  const [sessionTime, setSessionTime] = useState(0) // Current session time in seconds
  const [totalFocusTime, setTotalFocusTime] = useState(0)
  const [sessionsCompleted, setSessionsCompleted] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const sessionStartTime = useRef<Date | null>(null)
  const lastSaveTime = useRef<Date>(new Date())
  const supabase = createClient()

  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem('timerState')
    if (savedState) {
      const state = JSON.parse(savedState)
      
      // Calculate time elapsed since last save
      const now = new Date().getTime()
      const savedTime = new Date(state.lastSave).getTime()
      const elapsedSeconds = Math.floor((now - savedTime) / 1000)
      
      // Only restore if less than 1 hour has passed
      if (elapsedSeconds < 3600 && state.isRunning) {
        // Adjust timeLeft based on elapsed time
        const adjustedTimeLeft = Math.max(0, state.timeLeft - elapsedSeconds)
        
        setSelectedTaskId(state.selectedTaskId)
        setFocusMode(state.focusMode || FOCUS_MODES[0])
        setTimeLeft(adjustedTimeLeft)
        setIsBreak(state.isBreak || false)
        setSessionTime((state.sessionTime || 0) + elapsedSeconds)
        setTotalFocusTime(state.totalFocusTime || 0)
        setSessionsCompleted(state.sessionsCompleted || 0)
        
        // Resume if was running and time not expired
        if (adjustedTimeLeft > 0) {
          setIsRunning(true)
          sessionStartTime.current = new Date(savedTime)
        }
      } else if (!state.isRunning) {
        // Restore state without adjusting time
        setSelectedTaskId(state.selectedTaskId)
        setFocusMode(state.focusMode || FOCUS_MODES[0])
        setTimeLeft(state.timeLeft)
        setIsBreak(state.isBreak || false)
        setSessionTime(state.sessionTime || 0)
        setTotalFocusTime(state.totalFocusTime || 0)
        setSessionsCompleted(state.sessionsCompleted || 0)
      }
    }
  }, [])

  // Save timer state to localStorage
  useEffect(() => {
    const saveState = () => {
      const state = {
        selectedTaskId,
        focusMode,
        timeLeft,
        isRunning,
        isBreak,
        sessionTime,
        totalFocusTime,
        sessionsCompleted,
        lastSave: new Date().toISOString()
      }
      localStorage.setItem('timerState', JSON.stringify(state))
      lastSaveTime.current = new Date()
    }

    // Save state every second when running, or on any state change
    if (isRunning) {
      const saveInterval = setInterval(saveState, 1000)
      return () => clearInterval(saveInterval)
    } else {
      saveState()
    }
  }, [selectedTaskId, focusMode, timeLeft, isRunning, isBreak, sessionTime, totalFocusTime, sessionsCompleted])

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
    if (isRunning && !isBreak) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete()
            return 0
          }
          return prev - 1
        })
        setSessionTime(prev => prev + 1)
      }, 1000)
    } else if (isRunning && isBreak) {
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
    const today = new Date()
    const todayStr = format(today, 'yyyy-MM-dd')
    
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('completed', false)
      .or(`due_date.eq.${todayStr},due_date.is.null,due_date.lt.${todayStr}`)
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

  const saveTimeToDatabase = async (taskId: string, timeSpent: number) => {
    if (!taskId || timeSpent === 0) return

    const { data: currentTodo } = await supabase
      .from('todos')
      .select('total_time_spent, session_count')
      .eq('id', taskId)
      .single()

    if (currentTodo) {
      await supabase
        .from('todos')
        .update({
          total_time_spent: (currentTodo.total_time_spent || 0) + timeSpent,
          last_session_time: timeSpent,
          session_count: (currentTodo.session_count || 0) + 1,
          last_worked_at: new Date().toISOString()
        })
        .eq('id', taskId)
    }
  }

  const handleTimerComplete = async () => {
    setIsRunning(false)
    
    if (!isBreak) {
      // Focus session completed - save time
      if (currentTask && sessionTime > 0) {
        await saveTimeToDatabase(currentTask.id, sessionTime)
      }
      
      setTotalFocusTime(prev => prev + focusMode.focusTime)
      setSessionsCompleted(prev => prev + 1)
      
      toast.success(`포커스 세션 완료! ${formatTime(sessionTime)} 작업했습니다.`, {
        duration: 5000,
        icon: '🎉'
      })
      
      // Reset session time for next session
      setSessionTime(0)
      
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
    sessionStartTime.current = new Date()
  }

  const handlePause = async () => {
    setIsRunning(false)
    
    // Save current session time when pausing
    if (!isBreak && currentTask && sessionTime > 0) {
      await saveTimeToDatabase(currentTask.id, sessionTime)
      toast.success(`${formatTime(sessionTime)} 저장됨`, { duration: 2000 })
    }
  }

  const handleReset = async () => {
    // Save time before resetting if there's any
    if (!isBreak && currentTask && sessionTime > 0) {
      await saveTimeToDatabase(currentTask.id, sessionTime)
    }
    
    setIsRunning(false)
    setIsBreak(false)
    setTimeLeft(focusMode.focusTime * 60)
    setSessionTime(0)
  }

  const handleComplete = async () => {
    if (!currentTask) return
    
    // Save final session time
    if (sessionTime > 0) {
      await saveTimeToDatabase(currentTask.id, sessionTime)
    }
    
    await supabase
      .from('todos')
      .update({ completed: true })
      .eq('id', currentTask.id)
    
    const totalTime = (currentTask.total_time_spent || 0) + sessionTime
    toast.success(`작업 완료! 총 ${formatTime(totalTime)} 소요`, {
      duration: 5000,
      icon: '🎉'
    })
    
    setIsRunning(false)
    setIsBreak(false)
    setTimeLeft(focusMode.focusTime * 60)
    setSessionTime(0)
    
    // Refresh the page after completing task
    setTimeout(() => {
      window.location.reload()
    }, 1500)
  }

  const handleTaskSelect = (taskId: string) => {
    // Save current session time before switching
    if (currentTask && sessionTime > 0 && !isBreak) {
      saveTimeToDatabase(currentTask.id, sessionTime)
    }
    
    const task = todos.find(t => t.id === taskId)
    if (task) {
      setSelectedTaskId(taskId)
      setCurrentTask(task)
      setIsRunning(false)
      setIsBreak(false)
      setTimeLeft(focusMode.focusTime * 60)
      setSessionTime(0)
    }
  }

  const handleSkipBreak = () => {
    setIsBreak(false)
    setTimeLeft(focusMode.focusTime * 60)
    setIsRunning(false)
    toast.success('휴식을 건너뛰었습니다')
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}시간 ${mins}분 ${secs}초`
    } else if (mins > 0) {
      return `${mins}분 ${secs}초`
    } else {
      return `${secs}초`
    }
  }

  const formatTimeShort = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const progress = isBreak
    ? ((focusMode.breakTime * 60 - timeLeft) / (focusMode.breakTime * 60)) * 100
    : ((focusMode.focusTime * 60 - timeLeft) / (focusMode.focusTime * 60)) * 100

  return (
    <div className={cardStyles.full}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={headerStyles.page}>포커스 타이머</h2>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              오늘 {sessionsCompleted}개 세션
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              총 {totalFocusTime}분
            </span>
          </div>
        </div>
      </div>

      {/* Task Selection with Time Stats */}
      <div className="mb-6">
        <label className={`${textStyles.label} mb-2`}>
          작업 선택
        </label>
        <select
          value={selectedTaskId || ''}
          onChange={(e) => handleTaskSelect(e.target.value)}
          className={inputStyles.select}
        >
          <option value="">작업을 선택하세요</option>
          {todos.map((todo) => (
            <option key={todo.id} value={todo.id}>
              [{todo.priority === 'high' ? '🔴 높음' : todo.priority === 'medium' ? '🟡 보통' : '🟢 낮음'}] 
              {todo.title} 
              {todo.total_time_spent > 0 && ` (${formatTime(todo.total_time_spent)})`}
            </option>
          ))}
        </select>
      </div>

      {/* Task Stats */}
      {currentTask && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center mb-1">
                <Timer className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
                <span className="text-xs text-gray-500 dark:text-gray-400">총 시간</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {formatTime(currentTask.total_time_spent || 0)}
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
                <span className="text-xs text-gray-500 dark:text-gray-400">세션 수</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {currentTask.session_count || 0}회
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center mb-1">
                <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400 mr-1" />
                <span className="text-xs text-gray-500 dark:text-gray-400">마지막 작업</span>
              </div>
              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {currentTask.last_worked_at 
                  ? new Date(currentTask.last_worked_at).toLocaleDateString('ko-KR', { 
                      month: 'short', 
                      day: 'numeric' 
                    })
                  : '없음'
                }
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Focus Mode Selection */}
      <div className="mb-6">
        <label className={`${textStyles.label} mb-2`}>
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
              {isRunning && !isBreak && (
                <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-2">
                  현재 세션: {formatTimeShort(sessionTime)}
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
            {formatTimeShort(timeLeft)}
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