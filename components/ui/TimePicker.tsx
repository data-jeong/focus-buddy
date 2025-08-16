'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronUp, ChevronDown, Clock } from 'lucide-react'

interface TimePickerProps {
  value: string
  onChange: (time: string) => void
  label?: string
  className?: string
  disabled?: boolean
}

export default function TimePicker({ value, onChange, label, className = '', disabled = false }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [hours, minutes] = value.split(':').map(Number)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleHourChange = (newHour: number) => {
    const validHour = Math.max(0, Math.min(23, newHour))
    onChange(`${String(validHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`)
  }

  const handleMinuteChange = (newMinute: number) => {
    const validMinute = Math.max(0, Math.min(59, newMinute))
    onChange(`${String(hours).padStart(2, '0')}:${String(validMinute).padStart(2, '0')}`)
  }

  const popularTimes = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '13:00', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '19:00'
  ]

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-10 text-left bg-white dark:bg-gray-700 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            disabled 
              ? 'border-gray-200 dark:border-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed' 
              : 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:border-gray-400 dark:hover:border-gray-500'
          }`}
        >
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2 text-gray-400 dark:text-gray-500" />
            <span className="font-mono">{value}</span>
          </div>
        </button>
        
        {isOpen && !disabled && (
          <div 
            ref={dropdownRef}
            className="absolute z-50 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
          >
            {/* Time spinners */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-center space-x-4">
                {/* Hour spinner */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => handleHourChange(hours + 1)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <input
                    type="text"
                    value={String(hours).padStart(2, '0')}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0
                      handleHourChange(val)
                    }}
                    className="w-12 text-2xl font-mono text-center bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleHourChange(hours - 1)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">시간</span>
                </div>
                
                <span className="text-2xl font-mono text-gray-900 dark:text-gray-100">:</span>
                
                {/* Minute spinner */}
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    onClick={() => handleMinuteChange(minutes + 15)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <ChevronUp className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <input
                    type="text"
                    value={String(minutes).padStart(2, '0')}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0
                      handleMinuteChange(val)
                    }}
                    className="w-12 text-2xl font-mono text-center bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleMinuteChange(minutes - 15)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                  >
                    <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                  </button>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">분</span>
                </div>
              </div>
            </div>
            
            {/* Popular times */}
            <div className="p-2 max-h-48 overflow-y-auto">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 px-2">자주 사용하는 시간</p>
              <div className="grid grid-cols-3 gap-1">
                {popularTimes.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => {
                      onChange(time)
                      setIsOpen(false)
                    }}
                    className={`px-2 py-1 text-sm rounded transition-colors ${
                      time === value
                        ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-400 font-medium'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}