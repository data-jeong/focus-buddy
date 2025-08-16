import toast from 'react-hot-toast'

export interface AppError {
  code: string
  message: string
  details?: unknown
}

export class ErrorHandler {
  static handle(error: unknown, userMessage?: string): void {
    console.error('Error occurred:', error)
    
    if (error instanceof Error) {
      // Supabase specific errors
      if ('code' in error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        this.handleSupabaseError(error as any, userMessage)
        return
      }
      
      // Network errors
      if (error.message.includes('fetch')) {
        toast.error(userMessage || '네트워크 오류가 발생했습니다. 인터넷 연결을 확인해주세요.')
        return
      }
      
      // Generic error
      toast.error(userMessage || error.message || '오류가 발생했습니다.')
    } else {
      toast.error(userMessage || '알 수 없는 오류가 발생했습니다.')
    }
  }
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private static handleSupabaseError(error: any, userMessage?: string): void {
    const errorMessages: Record<string, string> = {
      '23505': '중복된 데이터가 존재합니다.',
      '23503': '참조하는 데이터가 존재하지 않습니다.',
      '23502': '필수 항목이 누락되었습니다.',
      '42501': '권한이 없습니다.',
      'PGRST301': '인증이 필요합니다. 다시 로그인해주세요.',
    }
    
    const message = errorMessages[error.code] || userMessage || error.message
    toast.error(message)
  }
  
  static async tryAsync<T>(
    fn: () => Promise<T>,
    errorMessage?: string
  ): Promise<T | null> {
    try {
      return await fn()
    } catch (error) {
      this.handle(error, errorMessage)
      return null
    }
  }
}