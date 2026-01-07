import { config } from '@/shared/config'

/**
 * Validates if an email is a valid institutional email
 */
export function validateInstitutionEmail(email: string, allowedDomains?: string[]): boolean {
  // Use provided domains or fall back to client config
  const validDomains = allowedDomains || config.auth.allowedDomains || []

  return validDomains.some((domain: string) => email.endsWith(`@${domain}`))
}

/**
 * Gets the list of available departments
 */
export function getDepartments(): string[] {
  return config.auth.departments || [
    'Other'
  ]
}

/**
 * Extracts department from email domain
 */
export function getDepartmentFromEmail(email: string): string | null {
  const domainMap: Record<string, string> = config.auth.domainMap || {}

  const domain = email.split('@')[1]
  return domainMap[domain] || null
}

/**
 * Formats user display name
 */
export function formatUserDisplayName(user: { full_name?: string; email?: string }): string {
  if (user.full_name) {
    return user.full_name
  }

  if (user.email) {
    const emailPart = user.email.split('@')[0]
    return emailPart.replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return 'Unknown User'
}

/**
 * Checks if user has required permissions
 */
export function hasPermission(user: any, permission: string): boolean {
  // Basic permission checking - can be extended based on requirements
  if (!user) return false

  // Admin users have all permissions
  if (user.role === 'admin') return true

  // Add more permission logic as needed
  return false
}

/**
 * Gets user initials for avatar display
 */
export function getUserInitials(user: { full_name?: string; email?: string }): string {
  if (user.full_name) {
    return user.full_name
      .split(' ')
      .map(name => name.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (user.email) {
    return user.email.charAt(0).toUpperCase()
  }

  return 'U'
}