import { TodoPriority } from '@/types/todo'

export const PRIORITY_COLORS: Record<TodoPriority | 'none', string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400 border-red-200 dark:border-red-800',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 border-green-200 dark:border-green-800',
  none: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400 border-gray-200 dark:border-gray-600'
} as const

export const PRIORITY_LABELS: Record<TodoPriority | 'none', string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
  none: '없음'
} as const

export const getPriorityColor = (priority: string): string => {
  return PRIORITY_COLORS[priority as TodoPriority] || PRIORITY_COLORS.none
}

export const getPriorityLabel = (priority: string): string => {
  return PRIORITY_LABELS[priority as TodoPriority] || PRIORITY_LABELS.none
}