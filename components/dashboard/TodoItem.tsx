'use client'

import React from 'react'
import { CheckCircle, Circle, Clock, Flag } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Todo } from '@/types/todo'
import { getPriorityColor, getPriorityLabel } from '@/lib/constants/priority'

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string, completed: boolean) => void
}

const TodoItem = React.memo(({ todo, onToggle }: TodoItemProps) => {
  const handleToggle = () => {
    onToggle(todo.id, todo.completed)
  }

  return (
    <div className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group">
      <button
        onClick={handleToggle}
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

export default TodoItem