'use client'

import { useState, useEffect } from 'react'
import { Play, Pause, RotateCcw, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function CurrentTask() {
  const [currentTask, setCurrentTask] = useState<any>(null)
  const [timer, setTimer] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchCurrentTask()
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  const fetchCurrentTask = async () => {
    const { data } = await supabase
      .from('todos')
      .select('*')
      .eq('completed', false)
      .order('priority', { ascending: false })
      .limit(1)
      .single()
    
    setCurrentTask(data)
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const handleComplete = async () => {
    if (!currentTask) return
    
    await supabase
      .from('todos')
      .update({ completed: true })
      .eq('id', currentTask.id)
    
    setTimer(0)
    setIsRunning(false)
    fetchCurrentTask()
  }

  if (!currentTask) {
    return (
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-xl font-bold mb-2">현재 집중할 작업</h2>
        <p className="opacity-90">할 일을 추가하여 시작하세요!</p>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h2 className="text-xl font-bold mb-2">현재 집중할 작업</h2>
          <h3 className="text-2xl font-semibold mb-1">{currentTask.title}</h3>
          {currentTask.description && (
            <p className="opacity-90 mb-4">{currentTask.description}</p>
          )}
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded text-xs font-medium bg-white/20`}>
              {currentTask.priority === 'high' ? '높음' : 
               currentTask.priority === 'medium' ? '보통' : '낮음'}
            </span>
          </div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold mb-4 font-mono">
            {formatTime(timer)}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
            >
              {isRunning ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button
              onClick={() => { setTimer(0); setIsRunning(false) }}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              onClick={handleComplete}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition"
            >
              <CheckCircle className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}