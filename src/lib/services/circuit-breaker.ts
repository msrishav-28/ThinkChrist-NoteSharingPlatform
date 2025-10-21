export interface CircuitBreakerConfig {
  failureThreshold: number
  resetTimeout: number
  monitoringPeriod: number
}

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED
  private failureCount = 0
  private lastFailureTime = 0
  private nextAttemptTime = 0

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        throw new Error('Circuit breaker is OPEN')
      }
      this.state = CircuitState.HALF_OPEN
    }

    try {
      const result = await operation()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failureCount = 0
    this.state = CircuitState.CLOSED
  }

  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN
      this.nextAttemptTime = Date.now() + this.config.resetTimeout
    }
  }

  getState(): CircuitState {
    return this.state
  }

  getFailureCount(): number {
    return this.failureCount
  }

  reset(): void {
    this.state = CircuitState.CLOSED
    this.failureCount = 0
    this.lastFailureTime = 0
    this.nextAttemptTime = 0
  }
}

// Global circuit breakers for different services
export class CircuitBreakerManager {
  private static breakers = new Map<string, CircuitBreaker>()

  static getBreaker(service: string): CircuitBreaker {
    if (!this.breakers.has(service)) {
      const config: CircuitBreakerConfig = {
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        monitoringPeriod: 300000 // 5 minutes
      }
      this.breakers.set(service, new CircuitBreaker(config))
    }
    return this.breakers.get(service)!
  }

  static resetBreaker(service: string): void {
    const breaker = this.breakers.get(service)
    if (breaker) {
      breaker.reset()
    }
  }

  static getAllStates(): Record<string, CircuitState> {
    const states: Record<string, CircuitState> = {}
    this.breakers.forEach((breaker, service) => {
      states[service] = breaker.getState()
    })
    return states
  }
}