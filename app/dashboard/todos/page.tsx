'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Filter, Search, CheckCircle, Circle, Trash2, Edit, CheckSquare } from 'lucide-react'
import TodoModal from '@/components/modals/TodoModal'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Todo {
  id: string
  title: string
  description?: string
  priority: string
  completed: boolean
  due_date?: string
  created_at?: string
  updated_at?: string
}

export default function TodosPage() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [filteredTodos, setFilteredTodos] = useState<Todo[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; todoId: string | null; todoTitle: string }>({ 
    open: false, 
    todoId: null, 
    todoTitle: '' 
  })
  const supabase = createClient()

  useEffect(() => {
    fetchTodos()
    
    const channel = supabase
      .channel('todos-page')
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
  }, [])

  useEffect(() => {
    filterTodos()
  }, [todos, filter, searchQuery])

  const fetchTodos = async () => {
    const { data } = await supabase
      .from('todos')
      .select('*')
      .order('created_at', { ascending: false })
    
    setTodos(data || [])
  }

  const filterTodos = () => {
    let filtered = [...todos]
    
    // Apply status filter
    if (filter === 'active') {
      filtered = filtered.filter(todo => !todo.completed)
    } else if (filter === 'completed') {
      filtered = filtered.filter(todo => todo.completed)
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(todo =>
        todo.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (todo.description && todo.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }
    
    setFilteredTodos(filtered)
  }

  const toggleTodo = async (id: string, completed: boolean) => {
    await supabase
      .from('todos')
      .update({ completed: !completed })
      .eq('id', id)
  }

  const deleteTodo = async () => {
    if (!deleteConfirm.todoId) return
    
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', deleteConfirm.todoId)
    
    if (error) {
      toast.error('삭제 실패')
    } else {
      toast.success('할 일이 삭제되었습니다')
      fetchTodos() // Re-render after deletion
    }
    setDeleteConfirm({ open: false, todoId: null, todoTitle: '' })
  }

  const handleEdit = (todo: any) => {
    setSelectedTodo(todo)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setSelectedTodo(null)
    // fetchTodos will be called automatically by realtime subscription
  }
  
  const handleModalSuccess = () => {
    fetchTodos() // Immediately fetch after successful save
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const stats = {
    total: todos.length,
    active: todos.filter(t => !t.completed).length,
    completed: todos.filter(t => t.completed).length,
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 할 일</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-gray-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">진행 중</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.active}</p>
            </div>
            <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
              <Circle className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">완료됨</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
            </div>
            <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Header */}
        <div className="border-b border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-gray-900">할 일 목록</h1>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 text-sm rounded ${
                    filter === 'all'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  전체
                </button>
                <button
                  onClick={() => setFilter('active')}
                  className={`px-3 py-1 text-sm rounded ${
                    filter === 'active'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  진행 중
                </button>
                <button
                  onClick={() => setFilter('completed')}
                  className={`px-3 py-1 text-sm rounded ${
                    filter === 'completed'
                      ? 'bg-indigo-100 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  완료됨
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                <Plus className="h-4 w-4" />
                <span>할 일 추가</span>
              </button>
            </div>
          </div>
        </div>

        {/* Todo List */}
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredTodos.length === 0 ? (
            <div className="py-16 px-8 text-center">
              {searchQuery ? (
                <div>
                  <Search className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">검색 결과가 없습니다</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">다른 검색어를 시도해보세요</p>
                </div>
              ) : (
                <div>
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckSquare className="h-10 w-10 text-indigo-500 dark:text-indigo-400" />
                  </div>
                  <p className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">할 일을 추가해보세요!</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">새로운 할 일을 추가하여 생산성을 높여보세요</p>
                  <button
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg hover:from-indigo-600 hover:to-purple-600 shadow-lg shadow-indigo-500/25 transition-all"
                  >
                    <Plus className="h-5 w-5" />
                    <span>첫 할 일 추가하기</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start space-x-3">
                  <button
                    onClick={() => toggleTodo(todo.id, todo.completed)}
                    className="mt-0.5 transition-transform hover:scale-110"
                  >
                    {todo.completed ? (
                      <CheckCircle className="h-5 w-5 text-success-500" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    )}
                  </button>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className={`text-sm font-medium ${
                          todo.completed ? 'line-through text-gray-400' : 'text-gray-900'
                        }`}>
                          {todo.title}
                        </h3>
                        {todo.description && (
                          <p className={`text-sm mt-1 ${
                            todo.completed ? 'text-gray-400' : 'text-gray-600'
                          }`}>
                            {todo.description}
                          </p>
                        )}
                        <div className="flex items-center space-x-3 mt-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                            getPriorityColor(todo.priority)
                          }`}>
                            {todo.priority === 'high' ? '높음' :
                             todo.priority === 'medium' ? '보통' : '낮음'}
                          </span>
                          {todo.due_date && (
                            <span className="text-xs text-gray-500">
                              마감: {format(new Date(todo.due_date), 'MM월 dd일 HH:mm', { locale: ko })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <button
                          onClick={() => handleEdit(todo)}
                          className="p-1 text-gray-400 hover:text-gray-600"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm({ 
                            open: true, 
                            todoId: todo.id, 
                            todoTitle: todo.title 
                          })}
                          className="p-1 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <TodoModal
        open={modalOpen}
        onClose={handleModalClose}
        todo={selectedTodo}
        onSuccess={handleModalSuccess}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteConfirm({ open: false, todoId: null, todoTitle: '' })} />
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
              할 일 삭제
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              "<span className="font-medium text-gray-900 dark:text-gray-100">{deleteConfirm.todoTitle}</span>"을(를) 삭제하시겠습니까?
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm({ open: false, todoId: null, todoTitle: '' })}
                className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                취소
              </button>
              <button
                onClick={deleteTodo}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}