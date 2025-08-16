'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { getTheme, setTheme as setThemeToDOM, type Theme } from '@/lib/theme'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const currentTheme = getTheme()
    setThemeState(currentTheme)
    setThemeToDOM(currentTheme)
  }, [])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    setThemeToDOM(newTheme)
  }

  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    // Return a default value instead of throwing error
    return {
      theme: 'system' as Theme,
      setTheme: (theme: Theme) => {
        setThemeToDOM(theme)
      }
    }
  }
  return context
}