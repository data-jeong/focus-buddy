'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Todo } from '@/types/todo'
import toast from 'react-hot-toast'

interface UseTodosOptions {
  limit?: number
  autoRefresh?: boolean
}

export function useTodos(initialTodos: Todo[] = [], options: UseTodosOptions = {}) {
  const { limit = 10, autoRefresh = true } = options
  const [todos, setTodos] = useState<Todo[]>(initialTodos)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const supabase = useMemo(() => createClient(), [])

  const fetchTodos = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('completed', { ascending: true })
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(limit)
      
      if (error) throw error
      
      if (data) {
        setTodos(data as Todo[])
      }
    } catch (err) {
      setError(err as Error)
      console.error('Error fetching todos:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase, limit])

  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ completed: !completed })
        .eq('id', id)
      
      if (error) throw error
      
      // Optimistic update
      setTodos(prev => prev.map(todo => 
        todo.id === id ? { ...todo, completed: !completed } : todo
      ))
    } catch (err) {
      toast.error('할 일 상태 변경 실패')
      console.error('Error toggling todo:', err)
    }
  }, [supabase])

  const addTodo = useCallback(async (todo: Partial<Todo>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')
      
      const { data, error } = await supabase
        .from('todos')
        .insert({ ...todo, user_id: user.id })
        .select()
        .single()
      
      if (error) throw error
      
      if (data) {
        setTodos(prev => [data as Todo, ...prev])
        toast.success('할 일이 추가되었습니다')
      }
    } catch (err) {
      toast.error('할 일 추가 실패')
      console.error('Error adding todo:', err)
    }
  }, [supabase])

  const deleteTodo = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      setTodos(prev => prev.filter(todo => todo.id !== id))
      toast.success('할 일이 삭제되었습니다')
    } catch (err) {
      toast.error('할 일 삭제 실패')
      console.error('Error deleting todo:', err)
    }
  }, [supabase])

  // Stats calculation
  const stats = useMemo(() => {
    const completed = todos.filter(t => t.completed).length
    const pending = todos.filter(t => !t.completed).length
    const highPriority = todos.filter(t => t.priority === 'high' && !t.completed).length
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const overdue = todos.filter(t => {
      if (!t.due_date || t.completed) return false
      const dueDate = new Date(t.due_date)
      return dueDate < today
    }).length
    
    return {
      total: todos.length,
      completed,
      pending,
      highPriority,
      overdue
    }
  }, [todos])

  useEffect(() => {
    if (!autoRefresh) return
    
    const channel = supabase
      .channel('todos-hook-changes')
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
  }, [supabase, fetchTodos, autoRefresh])

  return {
    todos,
    loading,
    error,
    stats,
    fetchTodos,
    toggleTodo,
    addTodo,
    deleteTodo
  }
}