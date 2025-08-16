'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { CheckCircle, Circle, Clock, Flag, ListTodo } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format, isToday, startOfDay, endOfDay } from 'date-fns'
import { ko } from 'date-fns/locale'
import toast from 'react-hot-toast'
import { Todo, Schedule } from '@/types/todo'
import { getPriorityColor, getPriorityLabel } from '@/lib/constants/priority'
import { cardStyles, headerStyles, listItemStyles, emptyStateStyles, badgeStyles } from '@/lib/constants/styles'

interface TodoWidgetProps {
  initialTodos: Todo[]
}

export default function TodoWidget({ initialTodos }: TodoWidgetProps) {
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [dragOverActive, setDragOverActive] = useState(false)
  const supabase = useMemo(() => createClient(), [])

  const fetchTodos = useCallback(async () => {
    try {
      const today = new Date()
      const todayStr = format(today, 'yyyy-MM-dd')
      
      // Fetch todos that are either:
      // 1. Due today
      // 2. Have no due date and are not completed
      // 3. Are overdue and not completed
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('completed', false)
        .or(`due_date.eq.${todayStr},due_date.is.null,due_date.lt.${todayStr}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (error) throw error
      
      if (data) {
        setTodos(data as Todo[])
      }
    } catch (error) {
      console.error('Error fetching todos:', error)
    }
  }, [supabase])

  useEffect(() => {
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
          fetchTodos()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchTodos])

  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
    try {
      // Optimistic update
      setTodos(prev => prev.map(todo => 
        todo.id === id ? { ...todo, completed: !completed } : todo
      ))
      
      const { error } = await supabase
        .from('todos')
        .update({ completed: !completed })
        .eq('id', id)
      
      if (error) throw error
    } catch (error) {
      // Revert on error
      setTodos(prev => prev.map(todo => 
        todo.id === id ? { ...todo, completed } : todo
      ))
      toast.error('상태 변경 실패')
      console.error('Error toggling todo:', error)
    }
  }, [supabase])

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
      
      // Create a new todo from the dropped schedule
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('로그인이 필요합니다')
        return
      }
      
      const { data, error } = await supabase
        .from('todos')
        .insert({
          user_id: user.id,
          title: schedule.title,
          description: schedule.description || '',
          priority: 'medium',
          due_date: schedule.start_time.split('T')[0],
          completed: false
        })
        .select()
        .single()
      
      if (error) {
        throw error
      } else {
        // Add to local state immediately
        if (data) {
          setTodos(prev => [data as Todo, ...prev])
        }
        toast.success('일정이 할 일로 추가되었습니다!', {
          icon: '✅'
        })
      }
    } catch (error) {
      console.error('Drop error:', error)
      toast.error('일정 변환 실패')
    }
  }, [supabase])

  // Calculate stats
  const stats = useMemo(() => {
    const pending = todos.filter(t => !t.completed).length
    const completed = todos.filter(t => t.completed).length
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    const overdue = todos.filter(t => {
      if (!t.due_date || t.completed) return false
      const dueDate = new Date(t.due_date)
      return dueDate < today
    }).length
    
    return { pending, completed, overdue }
  }, [todos])

  return (
    <div 
      className={`${cardStyles.full} transition-all duration-200 ${
        dragOverActive 
          ? 'border-2 border-indigo-500 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 scale-[1.01]' 
          : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className={headerStyles.widget}>오늘의 할 일</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-300">
            {stats.pending}개 남음
          </span>
          {stats.overdue > 0 && (
            <span className={`${badgeStyles.default} ${badgeStyles.danger}`}>
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
      
      <div className="space-y-3">
        {todos.length === 0 ? (
          <div className={emptyStateStyles.container}>
            <div className={emptyStateStyles.icon}>
              <ListTodo className={`${emptyStateStyles.iconSize} text-indigo-500 dark:text-indigo-400`} />
            </div>
            <p className={emptyStateStyles.title}>오늘 할 일이 없습니다</p>
            <p className={emptyStateStyles.description}>새로운 할 일을 추가해보세요!</p>
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

// Memoized TodoItem component for better performance
const TodoItem = React.memo(({ 
  todo, 
  onToggle 
}: { 
  todo: Todo
  onToggle: (id: string, completed: boolean) => void 
}) => {
  return (
    <div className={listItemStyles.base}>
      <button
        onClick={() => onToggle(todo.id, todo.completed)}
        className="mt-0.5 flex-shrink-0"
        aria-label={todo.completed ? '완료 취소' : '완료'}
      >
        {todo.completed ? (
          <CheckCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        ) : (
          <Circle className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p className={`text-sm flex-1 ${
            todo.completed 
              ? 'line-through text-gray-400 dark:text-gray-500' 
              : 'text-gray-900 dark:text-white'
          }`}>
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
          {todo.total_time_spent && todo.total_time_spent > 0 && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center">
              <Clock className="h-3 w-3 mr-1" />
              {Math.floor(todo.total_time_spent / 3600)}h {Math.floor((todo.total_time_spent % 3600) / 60)}m
            </p>
          )}
        </div>
      </div>
    </div>
  )
})

TodoItem.displayName = 'TodoItem'