import { validateFileUpload, validateURL } from '@/features/resources/utils'
import type { ResourceType } from '@/types'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  securityFlags: string[]
}

export interface FileValidationOptions {
  allowExecutables?: boolean
  maxFileSize?: number
  allowedMimeTypes?: string[]
  scanForMalware?: boolean
  checkFileIntegrity?: boolean
}

export interface URLValidationOptions {
  allowPrivateIPs?: boolean
  allowLocalhost?: boolean
  checkAccessibility?: boolean
  timeout?: number
  followRedirects?: boolean
}

export class UploadValidationService {
  // Security-sensitive file extensions
  private static readonly EXECUTABLE_EXTENSIONS = [
    'exe', 'bat', 'cmd', 'com', 'scr', 'pif', 'vbs', 'js', 'jar', 'app', 'deb', 'rpm',
    'dmg', 'pkg', 'msi', 'ps1', 'sh', 'bash', 'zsh', 'fish'
  ]

  // Potentially dangerous MIME types
  private static readonly DANGEROUS_MIME_TYPES = [
    'application/x-executable',
    'application/x-msdownload',
    'application/x-msdos-program',
    'application/x-winexe',
    'application/x-javascript',
    'text/javascript',
    'application/javascript'
  ]

  // File signature magic numbers for common file types
  private static readonly FILE_SIGNATURES: Record<string, number[]> = {
    'pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
    'zip': [0x50, 0x4B, 0x03, 0x04], // PK..
    'png': [0x89, 0x50, 0x4E, 0x47], // .PNG
    'jpg': [0xFF, 0xD8, 0xFF], // JPEG
    'gif': [0x47, 0x49, 0x46, 0x38], // GIF8
    'mp4': [0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70], // ....ftyp
    'avi': [0x52, 0x49, 0x46, 0x46], // RIFF
  }

  /**
   * Comprehensive file validation with security checks
   */
  static async validateFile(
    file: File,
    resourceType: ResourceType,
    options: FileValidationOptions = {}
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      securityFlags: []
    }

    try {
      // Basic validation using existing utility
      const basicValidation = validateFileUpload(file.name, file.size, file.type)
      if (!basicValidation.isValid) {
        result.errors.push(...basicValidation.errors)
        result.isValid = false
      }

      // File size validation with custom limits
      if (options.maxFileSize && file.size > options.maxFileSize) {
        result.errors.push(`File size exceeds limit (${Math.round(options.maxFileSize / 1024 / 1024)}MB)`)
        result.isValid = false
      }

      // MIME type validation
      if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.type)) {
        result.errors.push(`File type ${file.type} is not allowed`)
        result.isValid = false
      }

      // Security checks
      await this.performSecurityChecks(file, result, options)

      // File integrity checks
      if (options.checkFileIntegrity) {
        await this.checkFileIntegrity(file, result)
      }

      // Resource type specific validation
      this.validateResourceTypeSpecific(file, resourceType, result)

    } catch (error) {
      result.errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      result.isValid = false
    }

    return result
  }

  /**
   * Comprehensive URL validation with security checks
   */
  static async validateURLSecurity(
    url: string,
    options: URLValidationOptions = {}
  ): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
      securityFlags: []
    }

    try {
      // Basic URL validation
      const basicValidation = validateURL(url)
      if (!basicValidation.isValid) {
        result.errors.push(...basicValidation.errors)
        result.isValid = false
        return result
      }

      const urlObj = new URL(url)

      // Protocol validation
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        result.errors.push('Only HTTP and HTTPS protocols are allowed')
        result.isValid = false
      }

      // Private IP and localhost checks
      if (!options.allowPrivateIPs && this.isPrivateIP(urlObj.hostname)) {
        result.securityFlags.push('private_ip')
        result.errors.push('Private IP addresses are not allowed')
        result.isValid = false
      }

      if (!options.allowLocalhost && this.isLocalhost(urlObj.hostname)) {
        result.securityFlags.push('localhost')
        result.errors.push('Localhost URLs are not allowed')
        result.isValid = false
      }

      // Suspicious URL patterns
      this.checkSuspiciousURLPatterns(url, result)

      // URL accessibility check
      if (options.checkAccessibility && result.isValid) {
        await this.checkURLAccessibility(url, result, options)
      }

    } catch (error) {
      result.errors.push(`URL validation error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      result.isValid = false
    }

    return result
  }

  /**
   * Perform security checks on uploaded files
   */
  private static async performSecurityChecks(
    file: File,
    result: ValidationResult,
    options: FileValidationOptions
  ): Promise<void> {
    // Check for executable files
    if (!options.allowExecutables) {
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (extension && this.EXECUTABLE_EXTENSIONS.includes(extension)) {
        result.securityFlags.push('executable_file')
        result.errors.push('Executable files are not allowed')
        result.isValid = false
      }
    }

    // Check for dangerous MIME types
    if (this.DANGEROUS_MIME_TYPES.includes(file.type)) {
      result.securityFlags.push('dangerous_mime_type')
      result.warnings.push(`File type ${file.type} may pose security risks`)
    }

    // Check for suspicious file names
    if (this.hasSuspiciousFileName(file.name)) {
      result.securityFlags.push('suspicious_filename')
      result.warnings.push('File name contains suspicious patterns')
    }

    // Check for double extensions
    if (this.hasDoubleExtension(file.name)) {
      result.securityFlags.push('double_extension')
      result.warnings.push('File has multiple extensions which may be suspicious')
    }

    // Basic malware signature check (simplified)
    if (options.scanForMalware) {
      await this.basicMalwareCheck(file, result)
    }
  }

  /**
   * Check file integrity by validating file signatures
   */
  private static async checkFileIntegrity(file: File, result: ValidationResult): Promise<void> {
    try {
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer.slice(0, 16)) // Read first 16 bytes
      
      const extension = file.name.split('.').pop()?.toLowerCase()
      if (extension && this.FILE_SIGNATURES[extension]) {
        const expectedSignature = this.FILE_SIGNATURES[extension]
        const matches = expectedSignature.every((byte, index) => bytes[index] === byte)
        
        if (!matches) {
          result.warnings.push('File signature does not match expected format')
          result.securityFlags.push('signature_mismatch')
        }
      }
    } catch (error) {
      result.warnings.push('Could not verify file integrity')
    }
  }

  /**
   * Resource type specific validation
   */
  private static validateResourceTypeSpecific(
    file: File,
    resourceType: ResourceType,
    result: ValidationResult
  ): void {
    switch (resourceType) {
      case 'document':
        this.validateDocument(file, result)
        break
      case 'video':
        this.validateVideo(file, result)
        break
      case 'code':
        this.validateCode(file, result)
        break
    }
  }

  /**
   * Validate document files
   */
  private static validateDocument(file: File, result: ValidationResult): void {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/rtf'
    ]

    if (!allowedTypes.includes(file.type)) {
      result.warnings.push('File type may not be a standard document format')
    }

    // Size limits for documents (50MB)
    if (file.size > 50 * 1024 * 1024) {
      result.errors.push('Document files must be smaller than 50MB')
      result.isValid = false
    }
  }

  /**
   * Validate video files
   */
  private static validateVideo(file: File, result: ValidationResult): void {
    const allowedTypes = [
      'video/mp4',
      'video/avi',
      'video/quicktime',
      'video/x-msvideo',
      'video/webm',
      'video/x-matroska'
    ]

    if (!allowedTypes.includes(file.type)) {
      result.warnings.push('File type may not be a standard video format')
    }

    // Size limits for videos (500MB)
    if (file.size > 500 * 1024 * 1024) {
      result.errors.push('Video files must be smaller than 500MB')
      result.isValid = false
    }
  }

  /**
   * Validate code files
   */
  private static validateCode(file: File, result: ValidationResult): void {
    // Size limits for code files (10MB)
    if (file.size > 10 * 1024 * 1024) {
      result.errors.push('Code files must be smaller than 10MB')
      result.isValid = false
    }

    // Check for common code file extensions
    const extension = file.name.split('.').pop()?.toLowerCase()
    const codeExtensions = ['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'php', 'rb', 'go', 'rs', 'swift']
    
    if (extension && !codeExtensions.includes(extension) && file.type !== 'text/plain') {
      result.warnings.push('File extension may not be a recognized code file type')
    }
  }

  /**
   * Check if hostname is a private IP address
   */
  private static isPrivateIP(hostname: string): boolean {
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
      /^::1$/,
      /^fc00:/,
      /^fe80:/
    ]

    return privateRanges.some(range => range.test(hostname))
  }

  /**
   * Check if hostname is localhost
   */
  private static isLocalhost(hostname: string): boolean {
    return ['localhost', '127.0.0.1', '::1'].includes(hostname.toLowerCase())
  }

  /**
   * Check for suspicious URL patterns
   */
  private static checkSuspiciousURLPatterns(url: string, result: ValidationResult): void {
    const suspiciousPatterns = [
      /bit\.ly|tinyurl|t\.co|goo\.gl/, // URL shorteners
      /[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}/, // Raw IP addresses
      /[a-z0-9]{20,}\./, // Suspicious long subdomains
      /\.(tk|ml|ga|cf)$/, // Suspicious TLDs
    ]

    suspiciousPatterns.forEach(pattern => {
      if (pattern.test(url)) {
        result.warnings.push('URL contains potentially suspicious patterns')
        result.securityFlags.push('suspicious_url_pattern')
      }
    })
  }

  /**
   * Check URL accessibility
   */
  private static async checkURLAccessibility(
    url: string,
    result: ValidationResult,
    options: URLValidationOptions
  ): Promise<void> {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), options.timeout || 10000)

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        redirect: options.followRedirects ? 'follow' : 'manual'
      })

      clearTimeout(timeout)

      if (!response.ok) {
        result.warnings.push(`URL returned status ${response.status}`)
      }

      // Check content type
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('text/html')) {
        // This is likely a web page, which is fine
      } else if (contentType) {
        result.warnings.push(`URL points to ${contentType} content`)
      }

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        result.warnings.push('URL accessibility check timed out')
      } else {
        result.warnings.push('Could not verify URL accessibility')
      }
    }
  }

  /**
   * Check for suspicious file names
   */
  private static hasSuspiciousFileName(fileName: string): boolean {
    const suspiciousPatterns = [
      /\.(exe|bat|cmd|scr|pif|vbs)$/i,
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i, // Windows reserved names
      /[<>:"|?*]/, // Invalid characters
      /^\s|\s$/, // Leading/trailing spaces
      /\.\s/, // Dot followed by space
    ]

    return suspiciousPatterns.some(pattern => pattern.test(fileName))
  }

  /**
   * Check for double file extensions
   */
  private static hasDoubleExtension(fileName: string): boolean {
    const parts = fileName.split('.')
    return parts.length > 2 && parts[parts.length - 2].length <= 4
  }

  /**
   * Basic malware signature check (simplified implementation)
   */
  private static async basicMalwareCheck(file: File, result: ValidationResult): Promise<void> {
    try {
      // This is a very basic implementation
      // In production, you would use a proper antivirus API
      
      const buffer = await file.arrayBuffer()
      const bytes = new Uint8Array(buffer.slice(0, 1024)) // Check first 1KB
      
      // Simple signature patterns for common malware (this is not comprehensive)
      const malwareSignatures = [
        [0x4D, 0x5A, 0x90, 0x00], // PE executable header
        [0x7F, 0x45, 0x4C, 0x46], // ELF executable header
      ]

      for (const signature of malwareSignatures) {
        for (let i = 0; i <= bytes.length - signature.length; i++) {
          if (signature.every((byte, index) => bytes[i + index] === byte)) {
            result.securityFlags.push('potential_executable')
            result.warnings.push('File contains executable code patterns')
            break
          }
        }
      }
    } catch (error) {
      result.warnings.push('Could not perform malware scan')
    }
  }
}