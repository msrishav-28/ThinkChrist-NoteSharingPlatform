import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
  
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export function formatDate(date: string | Date) {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export function validateChristEmail(email: string) {
  // List of valid email domains for different departments
  const validDomains = [
    '@btech.christuniversity.in',
    '@mtech.christuniversity.in',
    '@psych.christuniversity.in',
    '@bba.christuniversity.in',
    '@mba.christuniversity.in',
    '@arch.christuniversity.in',
    '@bsc.christuniversity.in',
    '@msc.christuniversity.in',
    '@ba.christuniversity.in',
    '@ma.christuniversity.in',
    '@bcom.christuniversity.in',
    '@mcom.christuniversity.in',
    '@bca.christuniversity.in',
    '@mca.christuniversity.in',
    '@law.christuniversity.in',
    '@msw.christuniversity.in',
    '@bed.christuniversity.in',
    '@med.christuniversity.in',
    '@phd.christuniversity.in',
    '@christuniversity.in' // General domain as fallback
  ];

  // Check if email ends with any of the valid domains (case-insensitive)
  return validDomains.some(domain => email.toLowerCase().endsWith(domain));
}

export function getDepartments() {
  return [
    'Computer Science',
    'Commerce',
    'Psychology',
    'Economics',
    'Mathematics',
    'Physics',
    'Chemistry',
    'English',
    'Media Studies',
    'Law',
    'Management',
    'Life Sciences',
    'Social Work',
    'Education',
    'Architecture'
  ]
}
