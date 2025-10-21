/**
 * Error Handling Hook
 * Provides easy-to-use error handling utilities for React components
 */

import { useCallback, useState } from 'react'
import { ErrorHandlingService, type ErrorContext } from '@/lib/services/error-handling'

interface UseErrorHandlingOptions {
  context?: ErrorContext
  showToast?: boolean
  onError?: (error: any, errorId: string) => void
}

export function useErrorHandling(options: UseErrorHandlingOptions = {}) {
  const [lastError, setLastError] = useState<{
    error: any
    errorId: string
    timestamp: Date
  } | null>(null)

  const handleError = useCallback((
    error: any,
    contextOverride?: Partial<ErrorContext>,
    optionsOverride?: {
      showToast?: boolean
      severity?: 'low' | 'medium' | 'high' | 'critical'
      fallbackMessage?: string
    }
  ) => {
    const finalContext = { ...options.context, ...contextOverride }
    const finalOptions = {
      showToast: options.showToast ?? true,
      ...optionsOverride
    }

    const errorId = ErrorHandlingService.handleError(error, finalContext, finalOptions)
    
    const errorInfo = {
      error,
      errorId,
      timestamp: new Date()
    }
    
    setLastError(errorInfo)
    
    if (options.onError) {
      options.onError(error, errorId)
    }

    return errorId
  }, [options])

  const handleApiError = useCallback((
    error: any,
    contextOverride?: Partial<ErrorContext>,
    optionsOverride?: {
      showToast?: boolean
      fallbackMessage?: string
    }
  ) => {
    const finalContext = { ...options.context, ...contextOverride }
    const finalOptions = {
      showToast: options.showToast ?? true,
      ...optionsOverride
    }

    const errorId = ErrorHandlingService.handleApiError(error, finalContext, finalOptions)
    
    const errorInfo = {
      error,
      errorId,
      timestamp: new Date()
    }
    
    setLastError(errorInfo)
    
    if (options.onError) {
      options.onError(error, errorId)
    }

    return errorId
  }, [options])

  const handleUploadError = useCallback((
    error: any,
    contextOverride?: Partial<ErrorContext>
  ) => {
    const finalContext = { ...options.context, ...contextOverride }
    
    const errorId = ErrorHandlingService.handleUploadError(error, finalContext)
    
    const errorInfo = {
      error,
      errorId,
      timestamp: new Date()
    }
    
    setLastError(errorInfo)
    
    if (options.onError) {
      options.onError(error, errorId)
    }

    return errorId
  }, [options])

  const handleExternalServiceError = useCallback((
    serviceName: string,
    error: any,
    contextOverride?: Partial<ErrorContext>,
    fallbackAction?: () => void
  ) => {
    const finalContext = { ...options.context, ...contextOverride }
    
    const errorId = ErrorHandlingService.handleExternalServiceError(
      serviceName,
      error,
      finalContext,
      fallbackAction
    )
    
    const errorInfo = {
      error,
      errorId,
      timestamp: new Date()
    }
    
    setLastError(errorInfo)
    
    if (options.onError) {
      options.onError(error, errorId)
    }

    return errorId
  }, [options])

  const createSafeAsyncWrapper = useCallback(<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    contextOverride?: Partial<ErrorContext>,
    wrapperOptions?: {
      fallbackValue?: R
      showToast?: boolean
      onError?: (error: any) => void
    }
  ) => {
    return ErrorHandlingService.createSafeAsyncWrapper(
      fn,
      { ...options.context, ...contextOverride },
      {
        showToast: options.showToast ?? true,
        ...wrapperOptions,
        onError: (error) => {
          const errorInfo = {
            error,
            errorId: `safe_wrapper_${Date.now()}`,
            timestamp: new Date()
          }
          setLastError(errorInfo)
          
          if (wrapperOptions?.onError) {
            wrapperOptions.onError(error)
          }
          if (options.onError) {
            options.onError(error, errorInfo.errorId)
          }
        }
      }
    )
  }, [options])

  const withRetry = useCallback(<T>(
    fn: () => Promise<T>,
    retryOptions?: {
      maxRetries?: number
      baseDelay?: number
      maxDelay?: number
      contextOverride?: Partial<ErrorContext>
    }
  ) => {
    return ErrorHandlingService.withRetry(fn, {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      ...retryOptions,
      context: { ...options.context, ...retryOptions?.contextOverride }
    })
  }, [options])

  const clearLastError = useCallback(() => {
    setLastError(null)
  }, [])

  return {
    handleError,
    handleApiError,
    handleUploadError,
    handleExternalServiceError,
    createSafeAsyncWrapper,
    withRetry,
    lastError,
    clearLastError
  }
}

/**
 * Hook for handling async operations with automatic error handling
 */
export function useAsyncOperation<T = any>(
  operation: () => Promise<T>,
  options: UseErrorHandlingOptions & {
    onSuccess?: (result: T) => void
    fallbackValue?: T
  } = {}
) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<T | null>(null)
  const { handleError, createSafeAsyncWrapper } = useErrorHandling(options)

  const execute = useCallback(async () => {
    setLoading(true)
    
    const safeOperation = createSafeAsyncWrapper(
      operation,
      { action: 'async_operation' },
      {
        fallbackValue: options.fallbackValue,
        onError: (error) => {
          setResult(options.fallbackValue || null)
        }
      }
    )

    try {
      const result = await safeOperation()
      if (result !== undefined) {
        setResult(result)
        if (options.onSuccess) {
          options.onSuccess(result)
        }
      }
    } finally {
      setLoading(false)
    }
  }, [operation, options, createSafeAsyncWrapper])

  const reset = useCallback(() => {
    setResult(null)
    setLoading(false)
  }, [])

  return {
    execute,
    loading,
    result,
    reset
  }
}

/**
 * Hook for handling form submissions with error handling
 */
export function useFormSubmission<T = any>(
  submitFn: (data: T) => Promise<void>,
  options: UseErrorHandlingOptions & {
    onSuccess?: () => void
    resetOnSuccess?: boolean
  } = {}
) {
  const [submitting, setSubmitting] = useState(false)
  const { handleError } = useErrorHandling({
    ...options,
    context: { ...options.context, action: 'form_submission' }
  })

  const submit = useCallback(async (data: T) => {
    setSubmitting(true)
    
    try {
      await submitFn(data)
      if (options.onSuccess) {
        options.onSuccess()
      }
    } catch (error) {
      handleError(error, { additionalData: { formData: data } })
    } finally {
      setSubmitting(false)
    }
  }, [submitFn, options, handleError])

  return {
    submit,
    submitting
  }
}