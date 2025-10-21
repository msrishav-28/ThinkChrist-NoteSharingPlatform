import { ResourceType, ResourceTypeDetectionResult, FileTypeInfo, URLPatternMatch } from '@/types'

// File type mappings for document detection
const FILE_TYPE_MAPPINGS: FileTypeInfo[] = [
  // Documents
  { extension: 'pdf', mimeType: 'application/pdf', category: 'document' },
  { extension: 'doc', mimeType: 'application/msword', category: 'document' },
  { extension: 'docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', category: 'document' },
  { extension: 'ppt', mimeType: 'application/vnd.ms-powerpoint', category: 'document' },
  { extension: 'pptx', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', category: 'document' },
  { extension: 'xls', mimeType: 'application/vnd.ms-excel', category: 'document' },
  { extension: 'xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', category: 'document' },
  { extension: 'txt', mimeType: 'text/plain', category: 'document' },
  { extension: 'rtf', mimeType: 'application/rtf', category: 'document' },
  { extension: 'odt', mimeType: 'application/vnd.oasis.opendocument.text', category: 'document' },
  
  // Videos
  { extension: 'mp4', mimeType: 'video/mp4', category: 'video' },
  { extension: 'avi', mimeType: 'video/x-msvideo', category: 'video' },
  { extension: 'mov', mimeType: 'video/quicktime', category: 'video' },
  { extension: 'wmv', mimeType: 'video/x-ms-wmv', category: 'video' },
  { extension: 'flv', mimeType: 'video/x-flv', category: 'video' },
  { extension: 'webm', mimeType: 'video/webm', category: 'video' },
  { extension: 'mkv', mimeType: 'video/x-matroska', category: 'video' },
]

// URL patterns for different platforms
const URL_PATTERNS: URLPatternMatch[] = [
  // YouTube
  {
    pattern: /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/i,
    type: 'video',
    platform: 'youtube'
  },
  
  // GitHub
  {
    pattern: /^https?:\/\/(www\.)?github\.com\/[\w\-\.]+\/[\w\-\.]+/i,
    type: 'code',
    platform: 'github'
  },
  
  // GitLab
  {
    pattern: /^https?:\/\/(www\.)?gitlab\.com\/[\w\-\.]+\/[\w\-\.]+/i,
    type: 'code',
    platform: 'gitlab'
  },
  
  // Bitbucket
  {
    pattern: /^https?:\/\/(www\.)?bitbucket\.org\/[\w\-\.]+\/[\w\-\.]+/i,
    type: 'code',
    platform: 'bitbucket'
  },
  
  // Vimeo
  {
    pattern: /^https?:\/\/(www\.)?vimeo\.com\/\d+/i,
    type: 'video',
    platform: 'vimeo'
  },
  
  // Academic/Article sites
  {
    pattern: /^https?:\/\/(www\.)?(arxiv\.org|scholar\.google|researchgate\.net|academia\.edu)/i,
    type: 'article',
    platform: 'academic'
  },
  
  // Medium
  {
    pattern: /^https?:\/\/(www\.)?(medium\.com|[\w\-]+\.medium\.com)/i,
    type: 'article',
    platform: 'medium'
  },
  
  // Wikipedia
  {
    pattern: /^https?:\/\/[\w\-]+\.wikipedia\.org/i,
    type: 'article',
    platform: 'wikipedia'
  }
]

/**
 * Detects resource type from a file extension
 */
export function detectResourceTypeFromFile(fileName: string, mimeType?: string): ResourceTypeDetectionResult {
  const extension = fileName.split('.').pop()?.toLowerCase()
  
  if (!extension) {
    return {
      type: 'document',
      confidence: 0.3,
      metadata: { reason: 'no_extension' }
    }
  }
  
  // First try to match by extension
  const fileTypeMatch = FILE_TYPE_MAPPINGS.find(mapping => 
    mapping.extension === extension
  )
  
  if (fileTypeMatch) {
    return {
      type: fileTypeMatch.category,
      confidence: 0.9,
      metadata: {
        extension,
        mimeType: fileTypeMatch.mimeType,
        detectedBy: 'extension'
      }
    }
  }
  
  // If we have a mime type, try to match by that
  if (mimeType) {
    const mimeTypeMatch = FILE_TYPE_MAPPINGS.find(mapping => 
      mapping.mimeType === mimeType
    )
    
    if (mimeTypeMatch) {
      return {
        type: mimeTypeMatch.category,
        confidence: 0.8,
        metadata: {
          extension,
          mimeType,
          detectedBy: 'mimeType'
        }
      }
    }
  }
  
  // Fallback based on common patterns
  if (['js', 'ts', 'py', 'java', 'cpp', 'c', 'html', 'css', 'json', 'xml', 'sql'].includes(extension)) {
    return {
      type: 'code',
      confidence: 0.7,
      metadata: {
        extension,
        detectedBy: 'code_extension_pattern'
      }
    }
  }
  
  // Default to document
  return {
    type: 'document',
    confidence: 0.5,
    metadata: {
      extension,
      detectedBy: 'fallback'
    }
  }
}

/**
 * Detects resource type from a URL
 */
export function detectResourceTypeFromURL(url: string): ResourceTypeDetectionResult {
  try {
    const urlObj = new URL(url)
    
    // Check against known patterns
    for (const pattern of URL_PATTERNS) {
      if (pattern.pattern.test(url)) {
        return {
          type: pattern.type,
          confidence: 0.95,
          metadata: {
            platform: pattern.platform,
            domain: urlObj.hostname,
            detectedBy: 'url_pattern'
          }
        }
      }
    }
    
    // Check if URL points to a file by extension
    const pathname = urlObj.pathname
    const lastSegment = pathname.split('/').pop() || ''
    
    if (lastSegment.includes('.')) {
      const fileDetection = detectResourceTypeFromFile(lastSegment)
      if (fileDetection.confidence > 0.7) {
        return {
          ...fileDetection,
          confidence: fileDetection.confidence * 0.8, // Slightly lower confidence for URLs
          metadata: {
            ...fileDetection.metadata,
            domain: urlObj.hostname,
            detectedBy: 'url_file_extension'
          }
        }
      }
    }
    
    // Check for common video hosting domains
    const videoDomains = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com', 'twitch.tv']
    if (videoDomains.some(domain => urlObj.hostname.includes(domain))) {
      return {
        type: 'video',
        confidence: 0.8,
        metadata: {
          domain: urlObj.hostname,
          detectedBy: 'video_domain'
        }
      }
    }
    
    // Check for common code hosting domains
    const codeDomains = ['github.com', 'gitlab.com', 'bitbucket.org', 'sourceforge.net']
    if (codeDomains.some(domain => urlObj.hostname.includes(domain))) {
      return {
        type: 'code',
        confidence: 0.8,
        metadata: {
          domain: urlObj.hostname,
          detectedBy: 'code_domain'
        }
      }
    }
    
    // Default to link for valid URLs
    return {
      type: 'link',
      confidence: 0.6,
      metadata: {
        domain: urlObj.hostname,
        detectedBy: 'generic_url'
      }
    }
    
  } catch (error) {
    // Invalid URL
    return {
      type: 'link',
      confidence: 0.1,
      metadata: {
        error: 'invalid_url',
        detectedBy: 'error_fallback'
      }
    }
  }
}

/**
 * Main function to detect resource type from either file or URL
 */
export function detectResourceType(
  input: string,
  inputType: 'file' | 'url',
  mimeType?: string
): ResourceTypeDetectionResult {
  if (inputType === 'file') {
    return detectResourceTypeFromFile(input, mimeType)
  } else {
    return detectResourceTypeFromURL(input)
  }
}

/**
 * Validates if a resource type is supported
 */
export function isValidResourceType(type: string): type is ResourceType {
  const validTypes: ResourceType[] = ['document', 'video', 'link', 'code', 'article']
  return validTypes.includes(type as ResourceType)
}

/**
 * Gets file type information by extension
 */
export function getFileTypeInfo(extension: string): FileTypeInfo | null {
  return FILE_TYPE_MAPPINGS.find(mapping => 
    mapping.extension === extension.toLowerCase()
  ) || null
}

/**
 * Validates file type and size constraints
 */
export function validateFileUpload(
  fileName: string,
  fileSize: number,
  mimeType?: string
): { isValid: boolean; errors: string[]; resourceType?: ResourceType } {
  const errors: string[] = []
  
  // Detect resource type
  const detection = detectResourceTypeFromFile(fileName, mimeType)
  
  // File size limits (in bytes)
  const SIZE_LIMITS = {
    document: 50 * 1024 * 1024, // 50MB
    video: 500 * 1024 * 1024,   // 500MB
    code: 10 * 1024 * 1024,     // 10MB
    article: 10 * 1024 * 1024,  // 10MB
    link: 0 // Not applicable for links
  }
  
  const maxSize = SIZE_LIMITS[detection.type]
  if (maxSize > 0 && fileSize > maxSize) {
    errors.push(`File size exceeds maximum allowed size for ${detection.type} files (${Math.round(maxSize / 1024 / 1024)}MB)`)
  }
  
  // Check if file type is supported
  if (detection.confidence < 0.5) {
    errors.push('Unsupported file type')
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    resourceType: detection.type
  }
}

/**
 * Validates URL format and accessibility
 */
export function validateURL(url: string): { isValid: boolean; errors: string[]; resourceType?: ResourceType } {
  const errors: string[] = []
  
  try {
    const urlObj = new URL(url)
    
    // Check protocol
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      errors.push('URL must use HTTP or HTTPS protocol')
    }
    
    // Detect resource type
    const detection = detectResourceTypeFromURL(url)
    
    // Basic URL validation passed
    return {
      isValid: errors.length === 0,
      errors,
      resourceType: detection.type
    }
    
  } catch (error) {
    errors.push('Invalid URL format')
    return {
      isValid: false,
      errors
    }
  }
}