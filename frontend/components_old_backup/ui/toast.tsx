'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { X } from 'lucide-react'

interface Toast {
  id: number
  title: string
  description?: string
  status?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface ToastContextType {
  (props: Omit<Toast, 'id'>): void
}

const ToastContext = createContext<ToastContextType | null>(null)

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

interface ToastProviderProps {
  children: ReactNode
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Date.now()
    const duration = toast.duration || 5000 // Default 5 seconds
    
    setToasts((current) => [...current, { id, ...toast }])
    
    // Auto remove after duration
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id))
    }, duration)
  }

  const removeToast = (id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }

  const getBackgroundColor = (status?: string) => {
    switch(status) {
      case 'success': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      case 'warning': return 'bg-yellow-500'
      case 'info': 
      default: return 'bg-indigo-500'
    }
  }

  const getBorderColor = (status?: string) => {
    switch(status) {
      case 'success': return 'border-green-400'
      case 'error': return 'border-red-400'
      case 'warning': return 'border-yellow-400'
      case 'info':
      default: return 'border-indigo-400'
    }
  }
  
  const getTextColor = (status?: string) => {
    switch(status) {
      case 'success': return 'text-green-400'
      case 'error': return 'text-red-400'
      case 'warning': return 'text-yellow-400'
      case 'info':
      default: return 'text-indigo-400'
    }
  }

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={`rounded-lg bg-slate-800 border ${getBorderColor(toast.status)} p-4 shadow-lg max-w-md transform transition-all duration-300 ease-in-out animate-fade-in flex`}
          >
            <div className="flex-1">
              {toast.title && <h3 className="font-medium text-white">{toast.title}</h3>}
              {toast.description && <p className={`text-sm mt-1 ${getTextColor(toast.status)}`}>{toast.description}</p>}
            </div>
            <button onClick={() => removeToast(toast.id)} className="ml-4">
              <X className="h-5 w-5 text-slate-400 hover:text-white transition-colors" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
