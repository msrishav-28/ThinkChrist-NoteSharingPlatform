import { currentClient } from '@/clients'

// Configuration files
export const config = {
  app: {
    // Override base with client values
    name: currentClient.branding.appName,
    version: '1.0.0',
    description: currentClient.metadata.description
  },
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || '/api',
    timeout: 30000
  },
  upload: {
    maxFileSize: 500 * 1024 * 1024, // 500MB
    allowedTypes: [
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
  },
  pagination: {
    defaultPageSize: 20,
    maxPageSize: 100
  },
  branding: currentClient.branding,
  auth: currentClient.auth
}