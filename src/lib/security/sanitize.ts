/**
 * Security Utilities - XSS Sanitization
 * Provides safe HTML sanitization for user content
 */

/**
 * Escape HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
    const escapeMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    }
    return text.replace(/[&<>"'/]/g, (char) => escapeMap[char] || char)
}

/**
 * Sanitize HTML by escaping dangerous characters while allowing safe tags
 * Use this for any user-generated content displayed with dangerouslySetInnerHTML
 */
export function sanitizeHtml(html: string, allowedTags: string[] = ['mark', 'b', 'i', 'em', 'strong']): string {
    // First escape all HTML
    let result = escapeHtml(html)

    // Then selectively restore allowed tags
    allowedTags.forEach(tag => {
        // Restore opening tags with optional class attribute
        const openTagPattern = new RegExp(`&lt;${tag}(?:\\s+class=&quot;([^&]*)&quot;)?&gt;`, 'gi')
        result = result.replace(openTagPattern, (_, className) => {
            if (className) {
                // Sanitize class names - only allow alphanumeric, dashes, underscores, and spaces
                const sanitizedClass = className.replace(/[^a-zA-Z0-9\-_\s]/g, '')
                return `<${tag} class="${sanitizedClass}">`
            }
            return `<${tag}>`
        })

        // Restore closing tags
        const closeTagPattern = new RegExp(`&lt;/${tag}&gt;`, 'gi')
        result = result.replace(closeTagPattern, `</${tag}>`)
    })

    return result
}

/**
 * Highlight search terms in text with proper XSS protection
 */
export function highlightSearchTerms(
    text: string,
    query: string,
    highlightClass: string = 'bg-yellow-200 dark:bg-yellow-800 px-1 rounded'
): string {
    if (!query.trim() || !text) return escapeHtml(text)

    const terms = query.trim().split(/\s+/).filter(term => term.length > 1)
    if (terms.length === 0) return escapeHtml(text)

    // Escape the text first to prevent XSS
    let result = escapeHtml(text)

    // Then apply highlighting with escaped terms
    terms.forEach(term => {
        const escapedTerm = escapeHtml(term)
        const regex = new RegExp(`(${escapedTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
        result = result.replace(regex, `<mark class="${highlightClass}">$1</mark>`)
    })

    return result
}

/**
 * Validate and sanitize URL to prevent javascript: and data: schemes
 */
export function sanitizeUrl(url: string): string {
    if (!url) return ''

    const trimmedUrl = url.trim().toLowerCase()

    // Block dangerous URL schemes
    const dangerousSchemes = ['javascript:', 'data:', 'vbscript:', 'file:']
    if (dangerousSchemes.some(scheme => trimmedUrl.startsWith(scheme))) {
        return ''
    }

    // Ensure URL starts with allowed schemes or is relative
    const allowedSchemes = ['http://', 'https://', 'mailto:', 'tel:', '/']
    if (!allowedSchemes.some(scheme => trimmedUrl.startsWith(scheme)) && !trimmedUrl.startsWith('#')) {
        // Assume it's a relative URL
        return url.startsWith('/') ? url : `/${url}`
    }

    return url
}
