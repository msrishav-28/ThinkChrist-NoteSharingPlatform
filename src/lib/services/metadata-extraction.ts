import type { ResourceType } from '@/types'

export interface FileMetadata {
  // Common metadata
  fileName: string
  fileSize: number
  fileType: string
  mimeType?: string
  
  // Document-specific metadata
  pageCount?: number
  textContent?: string
  author?: string
  title?: string
  subject?: string
  keywords?: string[]
  
  // Video-specific metadata
  duration?: number
  resolution?: {
    width: number
    height: number
  }
  bitrate?: number
  codec?: string
  frameRate?: number
  
  // Image-specific metadata
  dimensions?: {
    width: number
    height: number
  }
  
  // Code-specific metadata
  language?: string
  linesOfCode?: number
  
  // Estimated reading/viewing time
  estimatedTime?: number
  
  // Extraction metadata
  extractedAt: Date
  extractionMethod: string
  extractionSuccess: boolean
  extractionErrors?: string[]
}

export interface MetadataExtractionOptions {
  extractText?: boolean
  maxTextLength?: number
  timeout?: number
}

export class MetadataExtractionService {
  private static readonly DEFAULT_TIMEOUT = 30000 // 30 seconds
  private static readonly MAX_TEXT_LENGTH = 10000 // 10KB of text

  /**
   * Extract metadata from a file
   */
  static async extractMetadata(
    file: File,
    resourceType: ResourceType,
    options: MetadataExtractionOptions = {}
  ): Promise<FileMetadata> {
    const baseMetadata: FileMetadata = {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      mimeType: file.type,
      extractedAt: new Date(),
      extractionMethod: 'browser',
      extractionSuccess: false,
      extractionErrors: []
    }

    try {
      switch (resourceType) {
        case 'document':
          return await this.extractDocumentMetadata(file, baseMetadata, options)
        case 'video':
          return await this.extractVideoMetadata(file, baseMetadata, options)
        case 'code':
          return await this.extractCodeMetadata(file, baseMetadata, options)
        default:
          // For other types, just return basic metadata
          return {
            ...baseMetadata,
            extractionSuccess: true,
            extractionMethod: 'basic'
          }
      }
    } catch (error) {
      return {
        ...baseMetadata,
        extractionSuccess: false,
        extractionErrors: [error instanceof Error ? error.message : 'Unknown error']
      }
    }
  }

  /**
   * Extract metadata from document files (PDF, DOC, etc.)
   */
  private static async extractDocumentMetadata(
    file: File,
    baseMetadata: FileMetadata,
    options: MetadataExtractionOptions
  ): Promise<FileMetadata> {
    const metadata = { ...baseMetadata }
    
    try {
      if (file.type === 'application/pdf') {
        // For PDF files, we can use PDF.js in the browser
        const pdfMetadata = await this.extractPDFMetadata(file, options)
        Object.assign(metadata, pdfMetadata)
      } else if (file.type === 'text/plain') {
        // For text files, extract content directly
        const textMetadata = await this.extractTextMetadata(file, options)
        Object.assign(metadata, textMetadata)
      } else {
        // For other document types, we can only extract basic info
        metadata.extractionMethod = 'basic_document'
      }

      // Estimate reading time (average 200 words per minute)
      if (metadata.textContent) {
        const wordCount = metadata.textContent.split(/\s+/).length
        metadata.estimatedTime = Math.ceil(wordCount / 200) // minutes
      }

      metadata.extractionSuccess = true
      return metadata
    } catch (error) {
      metadata.extractionErrors = [error instanceof Error ? error.message : 'Document extraction failed']
      return metadata
    }
  }

  /**
   * Extract metadata from video files
   */
  private static async extractVideoMetadata(
    file: File,
    baseMetadata: FileMetadata,
    options: MetadataExtractionOptions
  ): Promise<FileMetadata> {
    const metadata = { ...baseMetadata }
    
    try {
      // Create a video element to extract metadata
      const video = document.createElement('video')
      const url = URL.createObjectURL(file)
      
      return new Promise<FileMetadata>((resolve) => {
        const timeout = setTimeout(() => {
          URL.revokeObjectURL(url)
          metadata.extractionErrors = ['Video metadata extraction timeout']
          resolve(metadata)
        }, options.timeout || this.DEFAULT_TIMEOUT)

        video.onloadedmetadata = () => {
          clearTimeout(timeout)
          
          metadata.duration = Math.round(video.duration)
          metadata.resolution = {
            width: video.videoWidth,
            height: video.videoHeight
          }
          
          // Estimate viewing time (same as duration)
          metadata.estimatedTime = Math.ceil(video.duration / 60) // minutes
          
          metadata.extractionSuccess = true
          metadata.extractionMethod = 'video_element'
          
          URL.revokeObjectURL(url)
          resolve(metadata)
        }

        video.onerror = () => {
          clearTimeout(timeout)
          metadata.extractionErrors = ['Failed to load video for metadata extraction']
          URL.revokeObjectURL(url)
          resolve(metadata)
        }

        video.src = url
      })
    } catch (error) {
      metadata.extractionErrors = [error instanceof Error ? error.message : 'Video extraction failed']
      return metadata
    }
  }

  /**
   * Extract metadata from code files
   */
  private static async extractCodeMetadata(
    file: File,
    baseMetadata: FileMetadata,
    options: MetadataExtractionOptions
  ): Promise<FileMetadata> {
    const metadata = { ...baseMetadata }
    
    try {
      // Detect programming language from file extension
      const extension = file.name.split('.').pop()?.toLowerCase()
      metadata.language = this.detectProgrammingLanguage(extension || '')
      
      // Read file content to count lines
      const text = await file.text()
      const lines = text.split('\n')
      metadata.linesOfCode = lines.filter(line => line.trim().length > 0).length
      
      // Store a snippet of the code if requested
      if (options.extractText) {
        const maxLength = options.maxTextLength || this.MAX_TEXT_LENGTH
        metadata.textContent = text.length > maxLength 
          ? text.substring(0, maxLength) + '...'
          : text
      }
      
      // Estimate reading time (average 50 lines per minute for code)
      metadata.estimatedTime = Math.ceil(metadata.linesOfCode / 50) // minutes
      
      metadata.extractionSuccess = true
      metadata.extractionMethod = 'code_analysis'
      
      return metadata
    } catch (error) {
      metadata.extractionErrors = [error instanceof Error ? error.message : 'Code extraction failed']
      return metadata
    }
  }

  /**
   * Extract metadata from PDF files using PDF.js
   */
  private static async extractPDFMetadata(
    file: File,
    options: MetadataExtractionOptions
  ): Promise<Partial<FileMetadata>> {
    // Note: This is a simplified implementation
    // In a real application, you would use PDF.js library
    // For now, we'll return basic metadata
    
    try {
      // This would require PDF.js to be installed and configured
      // For the MVP, we'll just return basic info
      return {
        extractionMethod: 'pdf_basic',
        // pageCount: would be extracted using PDF.js
        // textContent: would be extracted using PDF.js
      }
    } catch (error) {
      throw new Error('PDF extraction not implemented')
    }
  }

  /**
   * Extract metadata from text files
   */
  private static async extractTextMetadata(
    file: File,
    options: MetadataExtractionOptions
  ): Promise<Partial<FileMetadata>> {
    try {
      const text = await file.text()
      const lines = text.split('\n')
      
      const result: Partial<FileMetadata> = {
        extractionMethod: 'text_file'
      }
      
      if (options.extractText) {
        const maxLength = options.maxTextLength || this.MAX_TEXT_LENGTH
        result.textContent = text.length > maxLength 
          ? text.substring(0, maxLength) + '...'
          : text
      }
      
      return result
    } catch (error) {
      throw new Error('Failed to read text file')
    }
  }

  /**
   * Detect programming language from file extension
   */
  private static detectProgrammingLanguage(extension: string): string {
    const languageMap: Record<string, string> = {
      'js': 'JavaScript',
      'jsx': 'JavaScript (React)',
      'ts': 'TypeScript',
      'tsx': 'TypeScript (React)',
      'py': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'cs': 'C#',
      'php': 'PHP',
      'rb': 'Ruby',
      'go': 'Go',
      'rs': 'Rust',
      'swift': 'Swift',
      'kt': 'Kotlin',
      'scala': 'Scala',
      'html': 'HTML',
      'css': 'CSS',
      'scss': 'SCSS',
      'sass': 'Sass',
      'less': 'Less',
      'json': 'JSON',
      'xml': 'XML',
      'yaml': 'YAML',
      'yml': 'YAML',
      'sql': 'SQL',
      'sh': 'Shell Script',
      'bash': 'Bash',
      'ps1': 'PowerShell',
      'r': 'R',
      'matlab': 'MATLAB',
      'm': 'MATLAB',
      'pl': 'Perl',
      'lua': 'Lua',
      'dart': 'Dart',
      'elm': 'Elm',
      'clj': 'Clojure',
      'hs': 'Haskell',
      'ml': 'OCaml',
      'fs': 'F#',
      'ex': 'Elixir',
      'erl': 'Erlang'
    }
    
    return languageMap[extension] || 'Unknown'
  }

  /**
   * Estimate content difficulty based on various factors
   */
  static estimateDifficulty(metadata: FileMetadata, resourceType: ResourceType): 'beginner' | 'intermediate' | 'advanced' {
    // This is a simplified heuristic-based approach
    // In a real application, you might use ML models or more sophisticated analysis
    
    if (resourceType === 'code') {
      if (!metadata.linesOfCode) return 'beginner'
      
      if (metadata.linesOfCode < 100) return 'beginner'
      if (metadata.linesOfCode < 500) return 'intermediate'
      return 'advanced'
    }
    
    if (resourceType === 'document') {
      if (!metadata.estimatedTime) return 'beginner'
      
      if (metadata.estimatedTime < 5) return 'beginner'
      if (metadata.estimatedTime < 20) return 'intermediate'
      return 'advanced'
    }
    
    if (resourceType === 'video') {
      if (!metadata.duration) return 'beginner'
      
      if (metadata.duration < 300) return 'beginner' // < 5 minutes
      if (metadata.duration < 1800) return 'intermediate' // < 30 minutes
      return 'advanced'
    }
    
    return 'beginner'
  }
}