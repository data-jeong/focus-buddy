'use client'

import { Plus, Calendar } from 'lucide-react'
import { useState } from 'react'
import TodoModal from '@/components/modals/TodoModal'
import ScheduleModal from '@/components/modals/ScheduleModal'

export default function QuickActions() {
  const [todoModalOpen, setTodoModalOpen] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)

  const actions = [
    {
      icon: Plus,
      label: '할 일 추가',
      onClick: () => setTodoModalOpen(true),
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      icon: Calendar,
      label: '일정 추가',
      onClick: () => setScheduleModalOpen(true),
      color: 'bg-green-500 hover:bg-green-600',
    },
  ]

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <button
              key={index}
              onClick={action.onClick}
              className={`${action.color} text-white rounded-lg p-4 transition-colors duration-200 flex flex-col items-center justify-center space-y-2`}
            >
              <Icon className="h-8 w-8" />
              <span className="text-sm font-medium">{action.label}</span>
            </button>
          )
        })}
      </div>
      
      <TodoModal open={todoModalOpen} onClose={() => setTodoModalOpen(false)} />
      <ScheduleModal open={scheduleModalOpen} onClose={() => setScheduleModalOpen(false)} />
    </>
  )
}