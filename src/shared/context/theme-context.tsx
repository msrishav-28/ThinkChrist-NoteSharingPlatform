'use client'

import React, { createContext, useContext } from 'react'

interface ThemeContextType {
  // Add theme state here
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function SharedThemeProvider({ children }: { children: React.ReactNode }) {
  const value: ThemeContextType = {
    // Initialize theme state
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useThemeContext() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider')
  }
  return context
}

export { ThemeContext }