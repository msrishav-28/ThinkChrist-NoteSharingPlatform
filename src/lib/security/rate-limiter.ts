/**
 * Rate Limiter for API Routes
 * Simple in-memory rate limiting (use Redis in production for distributed systems)
 */

interface RateLimitEntry {
    count: number
    resetTime: number
}

interface RateLimitConfig {
    windowMs: number  // Time window in milliseconds
    maxRequests: number  // Maximum requests per window
}

// In-memory store (use Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically
let cleanupInterval: NodeJS.Timeout | null = null

function startCleanup() {
    if (cleanupInterval) return

    cleanupInterval = setInterval(() => {
        const now = Date.now()
        const entries = Array.from(rateLimitStore.entries())
        for (const [key, entry] of entries) {
            if (entry.resetTime < now) {
                rateLimitStore.delete(key)
            }
        }
    }, 60000) // Cleanup every minute
}

/**
 * Check if request should be rate limited
 * @returns Object with limited status and remaining requests
 */
export function checkRateLimit(
    identifier: string,
    config: RateLimitConfig = { windowMs: 60000, maxRequests: 100 }
): { limited: boolean; remaining: number; resetTime: number } {
    startCleanup()

    const now = Date.now()
    const key = identifier

    let entry = rateLimitStore.get(key)

    // Create new entry or reset expired one
    if (!entry || entry.resetTime < now) {
        entry = {
            count: 0,
            resetTime: now + config.windowMs
        }
        rateLimitStore.set(key, entry)
    }

    entry.count++

    const remaining = Math.max(0, config.maxRequests - entry.count)
    const limited = entry.count > config.maxRequests

    return { limited, remaining, resetTime: entry.resetTime }
}

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimitConfigs = {
    // Standard API endpoints
    api: { windowMs: 60000, maxRequests: 100 },

    // Auth endpoints (stricter)
    auth: { windowMs: 300000, maxRequests: 10 },

    // Upload endpoints (very strict)
    upload: { windowMs: 300000, maxRequests: 20 },

    // Search endpoints
    search: { windowMs: 60000, maxRequests: 60 },

    // Admin endpoints
    admin: { windowMs: 60000, maxRequests: 200 },
}

/**
 * Create rate limit key from request
 */
export function getRateLimitKey(
    request: Request,
    prefix: string = 'api'
): string {
    // Try to get real IP from headers (for proxied requests)
    const forwarded = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    const ip = forwarded?.split(',')[0]?.trim() || realIp || 'unknown'

    return `${prefix}:${ip}`
}

/**
 * Apply rate limiting to an API route handler
 */
export function withRateLimit<T extends (...args: any[]) => Promise<Response>>(
    handler: T,
    config: RateLimitConfig = rateLimitConfigs.api
): T {
    return (async (...args: Parameters<T>) => {
        const request = args[0] as Request
        const key = getRateLimitKey(request)
        const { limited, remaining, resetTime } = checkRateLimit(key, config)

        if (limited) {
            return new Response(
                JSON.stringify({
                    error: 'Too many requests',
                    retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
                }),
                {
                    status: 429,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-RateLimit-Limit': config.maxRequests.toString(),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
                        'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
                    }
                }
            )
        }

        const response = await handler(...args)

        // Clone response to add rate limit headers
        const newResponse = new Response(response.body, response)
        newResponse.headers.set('X-RateLimit-Limit', config.maxRequests.toString())
        newResponse.headers.set('X-RateLimit-Remaining', remaining.toString())
        newResponse.headers.set('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString())

        return newResponse
    }) as T
}
