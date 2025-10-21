// Validation utility functions

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// validateChristEmail moved to @/features/auth/utils

export function validateUrl(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function validateFileSize(size: number, maxSize: number = 500 * 1024 * 1024): boolean {
  return size <= maxSize
}

export function validateFileType(type: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(type)
}