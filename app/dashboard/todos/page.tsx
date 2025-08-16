'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, Filter, Search, CheckCircle, Circle, Trash2, Edit } from 'lucide-react'
import TodoModal from '@/components/modals/TodoModal'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

export default function TodosPage() {
  const [todos, setTodos] = useState<any[]>([])
  const [filteredTodos, setFilteredTodos] = useState<any[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedTodo, setSelectedTodo] = useState<any>(null)
  const [filter, setFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
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

  const deleteTodo = async (id: string) => {
    const { error } = await supabase
      .from('todos')
      .delete()
      .eq('id', id)
    
    if (error) {
      toast.error('삭제 실패')
    } else {
      toast.success('할 일이 삭제되었습니다')
    }
  }

  const handleEdit = (todo: any) => {
    setSelectedTodo(todo)
    setModalOpen(true)
  }

  const handleModalClose = () => {
    setModalOpen(false)
    setSelectedTodo(null)
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
        <div className="divide-y divide-gray-200">
          {filteredTodos.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchQuery ? '검색 결과가 없습니다' : '할 일이 없습니다'}
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
                    className="mt-0.5"
                  >
                    {todo.completed ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-gray-400" />
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
                          onClick={() => deleteTodo(todo.id)}
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
      />
    </div>
  )
}