/**
 * Logger Service
 * Centralized logging with environment-aware log levels and structured output.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
    component?: string
    action?: string
    userId?: string
    resourceId?: string
    [key: string]: unknown
}

interface LogEntry {
    timestamp: string
    level: LogLevel
    message: string
    context?: LogContext
}

class Logger {
    private isDevelopment = process.env.NODE_ENV === 'development'

    private formatMessage(entry: LogEntry): string {
        const contextStr = entry.context
            ? ` ${JSON.stringify(entry.context)}`
            : ''
        return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr}`
    }

    private log(level: LogLevel, message: string, context?: LogContext): void {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            context
        }

        const formattedMessage = this.formatMessage(entry)

        switch (level) {
            case 'debug':
                // Only log debug messages in development
                if (this.isDevelopment) {
                    console.debug(formattedMessage)
                }
                break
            case 'info':
                console.info(formattedMessage)
                break
            case 'warn':
                console.warn(formattedMessage)
                break
            case 'error':
                console.error(formattedMessage)
                break
        }
    }

    /**
     * Log debug information (only visible in development)
     */
    debug(message: string, context?: LogContext): void {
        this.log('debug', message, context)
    }

    /**
     * Log informational messages
     */
    info(message: string, context?: LogContext): void {
        this.log('info', message, context)
    }

    /**
     * Log warning messages
     */
    warn(message: string, context?: LogContext): void {
        this.log('warn', message, context)
    }

    /**
     * Log error messages
     */
    error(message: string, context?: LogContext): void {
        this.log('error', message, context)
    }

    /**
     * Log an error object with stack trace
     */
    logError(error: Error, context?: LogContext): void {
        this.error(error.message, {
            ...context,
            stack: error.stack,
            name: error.name
        })
    }
}

// Export singleton instance
export const logger = new Logger()

// Export for module-level usage
export default logger
