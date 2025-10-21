import { APIMonitoringService } from './api-monitoring'

/**
 * Middleware to automatically track API usage and performance
 */
export function withAPIMonitoring<T extends any[], R>(
  service: 'youtube' | 'github',
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    const startTime = Date.now()
    let success = false
    let error: Error | undefined

    try {
      const result = await fn(...args)
      success = true
      return result
    } catch (err) {
      error = err instanceof Error ? err : new Error('Unknown error')
      throw err
    } finally {
      const responseTime = Date.now() - startTime
      APIMonitoringService.recordMetrics(service, success, responseTime, error)
    }
  }
}

/**
 * Decorator for class methods to add monitoring
 */
export function MonitorAPI(service: 'youtube' | 'github') {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now()
      let success = false
      let error: Error | undefined

      try {
        const result = await method.apply(this, args)
        success = true
        return result
      } catch (err) {
        error = err instanceof Error ? err : new Error('Unknown error')
        throw err
      } finally {
        const responseTime = Date.now() - startTime
        APIMonitoringService.recordMetrics(service, success, responseTime, error)
      }
    }

    return descriptor
  }
}

/**
 * Simple function wrapper for monitoring
 */
export async function monitoredAPICall<T>(
  service: 'youtube' | 'github',
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now()
  let success = false
  let error: Error | undefined

  try {
    const result = await operation()
    success = true
    return result
  } catch (err) {
    error = err instanceof Error ? err : new Error('Unknown error')
    throw err
  } finally {
    const responseTime = Date.now() - startTime
    APIMonitoringService.recordMetrics(service, success, responseTime, error)
  }
}