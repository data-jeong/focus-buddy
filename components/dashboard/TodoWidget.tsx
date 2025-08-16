'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Circle, Clock, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function TodoWidget({ initialTodos }: { initialTodos: any[] }) {
  const [todos, setTodos] = useState(initialTodos)
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
        return 'text-red-500'
      case 'medium':
        return 'text-yellow-500'
      case 'low':
        return 'text-green-500'
      default:
        return 'text-gray-500'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">오늘의 할 일</h2>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {todos.filter(t => !t.completed).length}개 남음
        </span>
      </div>
      
      <div className="space-y-3">
        {todos.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">할 일이 없습니다</p>
        ) : (
          todos.map((todo) => (
            <div
              key={todo.id}
              className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <button
                onClick={() => toggleTodo(todo.id, todo.completed)}
                className="mt-0.5"
              >
                {todo.completed ? (
                  <CheckCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                )}
              </button>
              <div className="flex-1">
                <p className={`text-sm ${todo.completed ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
                  {todo.title}
                </p>
                {todo.due_date && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    {format(new Date(todo.due_date), 'MM월 dd일', { locale: ko })}
                  </p>
                )}
              </div>
              <AlertCircle className={`h-4 w-4 ${getPriorityColor(todo.priority)}`} />
            </div>
          ))
        )}
      </div>
    </div>
  )
}