'use client'

import { useCallback, useState } from 'react'
import { ListTodo } from 'lucide-react'
import { useTodos } from '@/hooks/useTodos'
import { Todo, Schedule } from '@/types/todo'
import TodoItem from './TodoItem'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

interface TodoWidgetImprovedProps {
  initialTodos: Todo[]
}

export default function TodoWidgetImproved({ initialTodos }: TodoWidgetImprovedProps) {
  const { todos, toggleTodo, addTodo, stats } = useTodos(initialTodos)
  const [dragOverActive, setDragOverActive] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!dragOverActive) {
      setDragOverActive(true)
    }
  }, [dragOverActive])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only set to false if we're leaving the widget entirely
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setDragOverActive(false)
    }
  }, [])

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOverActive(false)
    
    const scheduleData = e.dataTransfer.getData('schedule')
    if (!scheduleData) return
    
    try {
      const schedule: Schedule = JSON.parse(scheduleData)
      
      await addTodo({
        title: schedule.title,
        description: schedule.description || '',
        priority: 'medium',
        due_date: schedule.start_time.split('T')[0],
        completed: false
      })
      
      toast.success('일정이 할 일로 추가되었습니다!', { icon: '✅' })
    } catch (error) {
      console.error('Drop error:', error)
      toast.error('일정 변환 실패')
    }
  }, [addTodo])

  return (
    <div 
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 transition-all duration-200 ${
        dragOverActive 
          ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.02]' 
          : 'border-gray-200 dark:border-gray-700'
      } p-6`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          오늘의 할 일
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-300">
            {stats.pending}개 남음
          </span>
          {stats.overdue > 0 && (
            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 rounded-full">
              {stats.overdue}개 지연
            </span>
          )}
        </div>
      </div>
      
      {dragOverActive && (
        <div className="mb-4 p-3 bg-indigo-100 dark:bg-indigo-900/50 border-2 border-dashed border-indigo-400 dark:border-indigo-500 rounded-lg text-center animate-pulse">
          <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">
            여기에 일정을 놓아서 할 일로 추가하세요
          </p>
        </div>
      )}
      
      <div className="space-y-2">
        {todos.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <ListTodo className="h-8 w-8 text-indigo-500 dark:text-indigo-400" />
            </div>
            <p className="text-base font-medium text-gray-900 dark:text-gray-100 mb-2">
              할 일이 없습니다
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              새로운 할 일을 추가해보세요!
            </p>
          </div>
        ) : (
          todos.map((todo) => (
            <TodoItem 
              key={todo.id} 
              todo={todo} 
              onToggle={toggleTodo}
            />
          ))
        )}
      </div>
    </div>
  )
}