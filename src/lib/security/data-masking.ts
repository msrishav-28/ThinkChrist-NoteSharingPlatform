/**
 * Data Masking Utility
 * 
 * Ensures sensitive data is never logged or exposed accidentally.
 * Use this for any logging that might include user information.
 */

// Fields that should always be masked
const SENSITIVE_FIELDS = [
    'email',
    'password',
    'token',
    'secret',
    'key',
    'authorization',
    'cookie',
    'session',
    'phone',
    'address',
    'ssn',
    'credit_card',
    'card_number',
    'cvv',
    'api_key',
    'apikey',
    'access_token',
    'refresh_token',
    'private_key',
    'service_role'
]

/**
 * Mask a string value (show first 2 and last 2 chars)
 */
export function maskString(value: string, showChars: number = 2): string {
    if (!value || value.length <= showChars * 2) {
        return '*'.repeat(value?.length || 8)
    }

    const start = value.substring(0, showChars)
    const end = value.substring(value.length - showChars)
    const masked = '*'.repeat(Math.min(value.length - showChars * 2, 8))

    return `${start}${masked}${end}`
}

/**
 * Mask email address (show domain, mask local part)
 */
export function maskEmail(email: string): string {
    if (!email || !email.includes('@')) return '***@***.***'

    const [local, domain] = email.split('@')
    const maskedLocal = local.length > 2
        ? `${local[0]}***${local[local.length - 1]}`
        : '***'

    return `${maskedLocal}@${domain}`
}

/**
 * Check if a key name suggests sensitive data
 */
function isSensitiveKey(key: string): boolean {
    const lowerKey = key.toLowerCase()
    return SENSITIVE_FIELDS.some(field => lowerKey.includes(field))
}

/**
 * Deep mask an object, replacing sensitive values with masked versions
 */
export function maskObject<T extends Record<string, unknown>>(
    obj: T,
    additionalFields: string[] = []
): T {
    if (!obj || typeof obj !== 'object') return obj

    const allSensitiveFields = [...SENSITIVE_FIELDS, ...additionalFields]
    const result: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase()
        const isSensitive = allSensitiveFields.some(field => lowerKey.includes(field))

        if (isSensitive) {
            if (typeof value === 'string') {
                if (lowerKey.includes('email')) {
                    result[key] = maskEmail(value)
                } else {
                    result[key] = maskString(value)
                }
            } else {
                result[key] = '[REDACTED]'
            }
        } else if (value && typeof value === 'object' && !Array.isArray(value)) {
            result[key] = maskObject(value as Record<string, unknown>, additionalFields)
        } else if (Array.isArray(value)) {
            result[key] = value.map(item =>
                typeof item === 'object' && item !== null
                    ? maskObject(item as Record<string, unknown>, additionalFields)
                    : item
            )
        } else {
            result[key] = value
        }
    }

    return result as T
}

/**
 * Safe stringify for logging - automatically masks sensitive data
 */
export function safeStringify(obj: unknown, additionalFields: string[] = []): string {
    if (obj === null || obj === undefined) return String(obj)

    if (typeof obj === 'string') {
        // Check if string looks like an email or token
        if (obj.includes('@')) return maskEmail(obj)
        if (obj.length > 20 && /^[A-Za-z0-9+/=_-]+$/.test(obj)) return maskString(obj)
        return obj
    }

    if (typeof obj !== 'object') return String(obj)

    try {
        const masked = maskObject(obj as Record<string, unknown>, additionalFields)
        return JSON.stringify(masked, null, 2)
    } catch {
        return '[Unable to stringify]'
    }
}

/**
 * Create a safe user object for logging (removes all PII)
 */
export function safeUserForLogging(user: Record<string, unknown>): Record<string, unknown> {
    if (!user) return {}

    return {
        id: user.id ? maskString(String(user.id)) : undefined,
        role: user.role,
        department: user.department,
        created_at: user.created_at,
        // Explicitly exclude: email, full_name, phone, etc.
    }
}

/**
 * Validate that a log message doesn't contain sensitive data
 */
export function validateLogMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase()

    // Check for email patterns
    if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(message)) {
        return false
    }

    // Check for sensitive keywords
    for (const field of SENSITIVE_FIELDS) {
        if (lowerMessage.includes(field) && lowerMessage.includes(':')) {
            return false
        }
    }

    return true
}
