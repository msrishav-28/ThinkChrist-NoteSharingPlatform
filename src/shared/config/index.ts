// Configuration files
export const config = {
  app: {
    name: 'ThinkChrist Note Sharing Platform',
    version: '1.0.0',
    description: 'A platform for sharing educational resources'
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
  }
}