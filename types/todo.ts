export interface Todo {
  id: string
  user_id: string
  title: string
  description: string | null
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  created_at: string
  updated_at: string
  total_time_spent?: number
}

export interface Schedule {
  id: string
  user_id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  color: string
  recurrence?: string
  recurrence_end?: string | null
  excluded_dates?: string | string[]
  created_at: string
  updated_at: string
  is_recurring_instance?: boolean
  original_id?: string
  instance_date?: string
}

export type TodoPriority = Todo['priority']

export interface TodoStats {
  total: number
  completed: number
  pending: number
  highPriority: number
  overdue: number
}