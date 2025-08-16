'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Circle, Clock, AlertCircle, Flag, Tag } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function TodoWidget({ initialTodos }: { initialTodos: any[] }) {
  const [todos, setTodos] = useState(initialTodos)
  const [dragOverActive, setDragOverActive] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    // Fetch latest todos
    const fetchTodos = async () => {
      const { data } = await supabase
        .from('todos')
        .select('*')
        .order('completed', { ascending: true })
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (data) {
        setTodos(data)
      }
    }

    const channel = supabase
      .channel('todos-widget-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'todos',
        },
        () => {
          // Refetch all todos on any change for consistency
          fetchTodos()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const toggleTodo = async (id: string, completed: boolean) => {
    await supabase
      .from('todos')
      .update({ completed: !completed })
      .eq('id', id)
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 border-red-200 dark:border-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 border-green-200 dark:border-green-800'
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-600'
    }
  }

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high':
        return '높음'
      case 'medium':
        return '보통'
      case 'low':
        return '낮음'
      default:
        return '없음'
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverActive(true)
  }

  const handleDragLeave = () => {
    setDragOverActive(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverActive(false)
    
    const scheduleData = e.dataTransfer.getData('schedule')
    if (!scheduleData) return
    
    try {
      const schedule = JSON.parse(scheduleData)
      
      // Create a new todo from the dropped schedule
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { error } = await supabase
        .from('todos')
        .insert({
          user_id: user.id,
          title: schedule.title,
          description: schedule.description || '',
          priority: 'medium',
          due_date: schedule.start_time.split('T')[0],
          completed: false
        })
      
      if (error) {
        toast.error('할 일 추가 실패')
      } else {
        toast.success('일정이 할 일로 추가되었습니다!', {
          icon: '✅'
        })
      }
    } catch (error) {
      console.error('Drop error:', error)
      toast.error('일정 변환 실패')
    }
  }

  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 transition-all ${
        dragOverActive 
          ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20' 
          : 'border-gray-200 dark:border-gray-700'
      } p-6`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">오늘의 할 일</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {todos.filter(t => !t.completed).length}개 남음
        </span>
      </div>
      
      {dragOverActive && (
        <div className="mb-4 p-3 bg-indigo-100 dark:bg-indigo-900/50 border-2 border-dashed border-indigo-400 dark:border-indigo-500 rounded-lg text-center">
          <p className="text-sm text-indigo-700 dark:text-indigo-300">
            여기에 일정을 놓아서 할 일로 추가하세요
          </p>
        </div>
      )}
      
      <div className="space-y-3">
        {todos.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">할 일이 없습니다</p>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
            >
              <button
                onClick={() => toggleTodo(todo.id, todo.completed)}
                className="mt-0.5 flex-shrink-0"
              >
                {todo.completed ? (
                  <CheckCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <p className={`text-sm flex-1 ${todo.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                    {todo.title}
                  </p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(todo.priority)}`}>
                    <Flag className="h-3 w-3 mr-1" />
                    {getPriorityLabel(todo.priority)}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {todo.due_date && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {format(new Date(todo.due_date), 'MM월 dd일', { locale: ko })}
                    </p>
                  )}
                  {todo.total_time_spent > 0 && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {Math.floor(todo.total_time_spent / 3600)}h {Math.floor((todo.total_time_spent % 3600) / 60)}m
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}