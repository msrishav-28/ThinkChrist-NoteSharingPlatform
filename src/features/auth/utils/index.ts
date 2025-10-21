// Authentication feature utilities

/**
 * Validates if an email is a valid Christ University email
 */
export function validateChristEmail(email: string): boolean {
  // List of valid email domains for different departments
  const validDomains = [
    'btech.christuniversity.in',
    'mtech.christuniversity.in',
    'mba.christuniversity.in',
    'bba.christuniversity.in',
    'bcom.christuniversity.in',
    'mcom.christuniversity.in',
    'bsc.christuniversity.in',
    'msc.christuniversity.in',
    'ba.christuniversity.in',
    'ma.christuniversity.in',
    'bca.christuniversity.in',
    'mca.christuniversity.in',
    'christuniversity.in'
  ]
  
  return validDomains.some(domain => email.endsWith(`@${domain}`))
}

/**
 * Gets the list of available departments
 */
export function getDepartments(): string[] {
  return [
    'Computer Science & Engineering',
    'Information Technology',
    'Electronics & Communication',
    'Mechanical Engineering',
    'Civil Engineering',
    'Business Administration',
    'Commerce',
    'Economics',
    'Psychology',
    'English',
    'Mathematics',
    'Physics',
    'Chemistry',
    'Biology',
    'Other'
  ]
}

/**
 * Extracts department from email domain
 */
export function getDepartmentFromEmail(email: string): string | null {
  const domainMap: Record<string, string> = {
    'btech.christuniversity.in': 'Engineering',
    'mtech.christuniversity.in': 'Engineering',
    'mba.christuniversity.in': 'Business Administration',
    'bba.christuniversity.in': 'Business Administration',
    'bcom.christuniversity.in': 'Commerce',
    'mcom.christuniversity.in': 'Commerce',
    'bsc.christuniversity.in': 'Science',
    'msc.christuniversity.in': 'Science',
    'ba.christuniversity.in': 'Arts',
    'ma.christuniversity.in': 'Arts',
    'bca.christuniversity.in': 'Computer Applications',
    'mca.christuniversity.in': 'Computer Applications'
  }

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