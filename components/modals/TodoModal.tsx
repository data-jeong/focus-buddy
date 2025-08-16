'use client'

import { useState, useEffect } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { modalStyles, buttonStyles, inputStyles, textStyles } from '@/lib/constants/styles'

interface TodoModalProps {
  open: boolean
  onClose: () => void
  todo?: any
  onSuccess?: () => void // Callback for successful save
}

export default function TodoModal({ open, onClose, todo, onSuccess }: TodoModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (todo) {
      setTitle(todo.title || '')
      setDescription(todo.description || '')
      setPriority(todo.priority || 'medium')
    } else {
      setTitle('')
      setDescription('')
      setPriority('medium')
    }
  }, [todo, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      toast.error('제목을 입력해주세요')
      return
    }
    
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        toast.error('로그인이 필요합니다')
        return
      }

      const todoData = {
        title,
        description: description || null,
        priority,
        user_id: user.id,
      }

      if (todo) {
        const { error } = await supabase
          .from('todos')
          .update(todoData)
          .eq('id', todo.id)
        
        if (error) throw error
        toast.success('할 일이 수정되었습니다')
      } else {
        const { error } = await supabase
          .from('todos')
          .insert([todoData])
        
        if (error) throw error
        toast.success('할 일이 추가되었습니다')
      }

      onSuccess?.() // Call success callback if provided
      onClose()
    } catch (error) {
      toast.error('오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className={modalStyles.overlay} />
        <Dialog.Content className={modalStyles.content}>
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className={modalStyles.title}>
              {todo ? '할 일 수정' : '새 할 일 추가'}
            </Dialog.Title>
            <Dialog.Close className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
              <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`${textStyles.label} mb-1`}>
                제목 *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputStyles.base}
                required
                autoFocus
              />
            </div>

            <div>
              <label className={`${textStyles.label} mb-1`}>
                설명
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputStyles.base}
                rows={3}
              />
            </div>

            <div>
              <label className={`${textStyles.label} mb-1`}>
                우선순위
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className={inputStyles.base}
              >
                <option value="low">낮음</option>
                <option value="medium">보통</option>
                <option value="high">높음</option>
              </select>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 ${buttonStyles.secondary}`}
              >
                취소
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 ${buttonStyles.primary}`}
              >
                {loading ? '처리 중...' : todo ? '수정하기' : '저장하기'}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}