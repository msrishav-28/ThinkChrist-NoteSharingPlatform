import { config } from '@/shared/config'

// Application constants
export const APP_NAME = config.app.name
export const MAX_FILE_SIZE = 500 * 1024 * 1024 // 500MB
export const SUPPORTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'application/zip',
  'application/x-rar-compressed',
  'image/jpeg',
  'image/png',
  'video/mp4',
  'video/avi',
  'video/quicktime'
]

export const DEPARTMENTS = config.auth.departments || []