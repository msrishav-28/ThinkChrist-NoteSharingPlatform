'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Upload, FileIcon, X, Loader2, Link, Video, Code, FileText, Tag, Plus } from 'lucide-react'
import { useToast } from '@/lib/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/features/auth'
import { useTags } from '@/lib/hooks/use-tags'
import { formatBytes } from '@/lib/utils'
import { getDepartments } from '@/features/auth/utils'
import { detectResourceType, validateFileUpload, validateURL } from '@/features/resources/utils'
import { LinkPreviewService } from '@/lib/services/link-preview'
import { MetadataExtractionService, type FileMetadata } from '@/lib/services/metadata-extraction'
import { UploadValidationService, type ValidationResult } from '@/lib/services/upload-validation'
import { TagInput } from '@/components/ui/tag-input'
import type { ResourceType, LinkPreview } from '@/types'
import { BackwardCompatibilityService } from '@/shared/utils/backward-compatibility'
import { ErrorHandlingService } from '@/lib/services/error-handling'
import { UploadErrorBoundary } from '@/components/common/error-boundary'
import { UploadFallback, LinkPreviewFallback } from '@/components/common/fallback-components'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

const uploadSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  department: z.string().min(1, 'Please select a department'),
  course: z.string().min(1, 'Please enter a course'),
  semester: z.string().min(1, 'Please select a semester'),
  subject: z.string().min(1, 'Please enter a subject'),
  topic: z.string().optional(),
  resource_type: z.enum(['document', 'video', 'link', 'code', 'article']).optional(),
  external_url: z.string().url().optional(),
  tags: z.array(z.string()).optional(),
})

type UploadFormData = z.infer<typeof uploadSchema>

type UploadMode = 'file' | 'url'

export function UploadForm() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploadMode, setUploadMode] = useState<UploadMode>('file')
  const [detectedResourceType, setDetectedResourceType] = useState<ResourceType | null>(null)
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [url, setUrl] = useState('')
  const [fileMetadata, setFileMetadata] = useState<FileMetadata | null>(null)
  const [metadataLoading, setMetadataLoading] = useState(false)
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const supabase = createClient()

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      title: '',
      description: '',
      department: profile?.department || '',
      course: '',
      semester: profile?.semester.toString() || '',
      subject: '',
      topic: '',
      tags: [],
    },
  })

  // Initialize tag management
  const {
    suggestions: tagSuggestions,
    existingTags,
    loading: tagsLoading,
    generateSuggestions,
    searchTags,
    normalizeTag
  } = useTags({
    department: form.watch('department'),
    course: form.watch('course'),
    resourceType: detectedResourceType || undefined,
    enableSuggestions: true
  })

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleFile = async (file: File) => {
    // Auto-detect resource type first
    const detection = detectResourceType(file.name, 'file', file.type)

    // Comprehensive validation with security checks
    const validation = await UploadValidationService.validateFile(file, detection.type, {
      allowExecutables: false,
      scanForMalware: true,
      checkFileIntegrity: true,
    })

    setValidationResult(validation)

    if (!validation.isValid) {
      ErrorHandlingService.handleError(
        `File validation failed: ${validation.errors.join(', ')}`,
        { component: 'UploadForm', action: 'file_validation' },
        { showToast: true, severity: 'low' }
      )
      return
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      toast({
        title: 'File validation warnings',
        description: validation.warnings.join(', '),
        variant: 'default',
      })
    }

    setFile(file)
    setDetectedResourceType(detection.type)
    form.setValue('resource_type', detection.type)

    // Auto-fill title if empty
    if (!form.getValues('title')) {
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
      form.setValue('title', nameWithoutExt)

      // Generate tag suggestions based on filename
      generateSuggestions(nameWithoutExt)
    }

    // Extract metadata
    setMetadataLoading(true)
    try {
      const metadata = await MetadataExtractionService.extractMetadata(
        file,
        detection.type,
        { extractText: true, maxTextLength: 1000 }
      )
      setFileMetadata(metadata)

      // Auto-fill description with extracted content if available and description is empty
      if (!form.getValues('description') && metadata.textContent) {
        const snippet = metadata.textContent.length > 200
          ? metadata.textContent.substring(0, 200) + '...'
          : metadata.textContent
        form.setValue('description', snippet)
      }
    } catch (error) {
      ErrorHandlingService.handleError(
        error as Error,
        { component: 'UploadForm', action: 'metadata_extraction' },
        { showToast: false, severity: 'low' }
      )
    } finally {
      setMetadataLoading(false)
    }
  }

  const handleUrlChange = async (inputUrl: string) => {
    setUrl(inputUrl)
    setLinkPreview(null)
    setDetectedResourceType(null)
    setValidationResult(null)

    if (!inputUrl.trim()) {
      form.setValue('external_url', '')
      form.setValue('resource_type', undefined)
      return
    }

    // Comprehensive URL validation with security checks
    const validation = await UploadValidationService.validateURLSecurity(inputUrl, {
      allowPrivateIPs: false,
      allowLocalhost: false,
      checkAccessibility: true,
      timeout: 10000,
    })

    setValidationResult(validation)

    if (!validation.isValid) {
      ErrorHandlingService.handleError(
        `URL validation failed: ${validation.errors.join(', ')}`,
        { component: 'UploadForm', action: 'url_validation' },
        { showToast: true, severity: 'low' }
      )
      return
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      toast({
        title: 'URL validation warnings',
        description: validation.warnings.join(', '),
        variant: 'default',
      })
    }

    form.setValue('external_url', inputUrl)

    // Auto-detect resource type
    const detection = detectResourceType(inputUrl, 'url')
    setDetectedResourceType(detection.type || 'link')
    form.setValue('resource_type', detection.type || 'link')

    // Generate link preview
    if (inputUrl.startsWith('http')) {
      setPreviewLoading(true)
      try {
        const preview = await LinkPreviewService.generatePreview(inputUrl)
        setLinkPreview(preview)

        // Auto-fill title if empty
        if (!form.getValues('title') && preview.title) {
          form.setValue('title', preview.title)
        }

        // Auto-fill description if empty
        if (!form.getValues('description') && preview.description) {
          form.setValue('description', preview.description)
        }

        // Generate tag suggestions based on link preview
        if (preview.title || preview.description) {
          generateSuggestions(preview.title || '', preview.description)
        }
      } catch (error) {
        ErrorHandlingService.handleExternalServiceError(
          'Link Preview',
          error,
          { component: 'UploadForm', action: 'link_preview' },
          () => {
            // Fallback: still allow the upload without preview
            setLinkPreview(null)
          }
        )
      } finally {
        setPreviewLoading(false)
      }
    }
  }

  // Effect to handle upload mode changes
  useEffect(() => {
    if (uploadMode === 'file') {
      setUrl('')
      setLinkPreview(null)
      form.setValue('external_url', '')
    } else {
      setFile(null)
      setFileMetadata(null)
    }
    setDetectedResourceType(null)
    setValidationResult(null)
    form.setValue('resource_type', undefined)
  }, [uploadMode, form])

  // Effect to generate tag suggestions when title/description changes
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'title' || name === 'description') {
        const title = value.title || ''
        const description = value.description || ''

        if (title.length > 3) {
          generateSuggestions(title, description)
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [form, generateSuggestions])

  // Effect to search existing tags for autocomplete
  useEffect(() => {
    const searchExistingTags = async () => {
      await searchTags('')
    }
    searchExistingTags()
  }, [searchTags])

  const onSubmit = async (data: UploadFormData) => {
    // Validate based on upload mode
    if (uploadMode === 'file' && !file) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      })
      return
    }

    if (uploadMode === 'url' && !data.external_url) {
      toast({
        title: 'No URL provided',
        description: 'Please enter a valid URL',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      let resourceData: any = {
        title: data.title,
        description: data.description,
        department: data.department,
        course: data.course,
        subject: data.subject,
        topic: data.topic,
        uploaded_by: user?.id,
        semester: parseInt(data.semester),
        resource_type: data.resource_type || detectedResourceType || 'document',
        tags: tags.length > 0 ? tags : null,
      }

      if (uploadMode === 'file' && file) {
        // Upload file to storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${user?.id}-${Date.now()}.${fileExt}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('resources')
          .upload(fileName, file)

        if (uploadError) {
          throw uploadError
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('resources')
          .getPublicUrl(fileName)

        resourceData = {
          ...resourceData,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          content_metadata: fileMetadata ? JSON.stringify(fileMetadata) : null,
          estimated_time: fileMetadata?.estimatedTime || null,
          difficulty_level: fileMetadata ? MetadataExtractionService.estimateDifficulty(fileMetadata, detectedResourceType || 'document') : null,
        }
      } else if (uploadMode === 'url') {
        resourceData = {
          ...resourceData,
          external_url: data.external_url,
          link_preview: linkPreview ? JSON.stringify(linkPreview) : null,
        }
      }

      // Ensure backward compatibility - set default values for new fields
      const compatibleResourceData = {
        ...resourceData,
        resource_type: resourceData.resource_type || 'document',
        tags: resourceData.tags || [],
        views: 0,
        content_metadata: resourceData.content_metadata || {},
      }

      // Create resource record
      const { data: resource, error: dbError } = await supabase
        .from('resources')
        .insert(compatibleResourceData)
        .select()
        .single()

      if (dbError) {
        throw dbError
      }

      // Add contribution points
      await supabase
        .from('contributions')
        .insert({
          user_id: user?.id,
          type: 'upload',
          resource_id: resource.id,
          points_earned: 10, // 10 points for upload
        })

      // Update user points
      await supabase
        .from('users')
        .update({
          points: (profile?.points || 0) + 10
        })
        .eq('id', user?.id)

      toast({
        title: 'Success!',
        description: 'Resource uploaded successfully. You earned 10 points!',
      })

      router.push('/resources')
    } catch (error) {
      ErrorHandlingService.handleUploadError(error, {
        component: 'UploadForm',
        action: 'upload',
        userId: user?.id,
        additionalData: {
          uploadMode,
          resourceType: data.resource_type || detectedResourceType,
          fileSize: file?.size,
          fileName: file?.name
        }
      })
    } finally {
      setLoading(false)
    }
  }

  const getResourceTypeIcon = (type: ResourceType) => {
    switch (type) {
      case 'video':
        return <Video className="h-4 w-4" />
      case 'code':
        return <Code className="h-4 w-4" />
      case 'link':
        return <Link className="h-4 w-4" />
      case 'article':
        return <FileText className="h-4 w-4" />
      default:
        return <FileIcon className="h-4 w-4" />
    }
  }

  return (
    <UploadErrorBoundary>
      <Card className="max-w-2xl mx-auto border-0 shadow-2xl glass bg-white/50 dark:bg-black/50 backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Upload Resource</CardTitle>
          <CardDescription>
            Share your files, links, videos, and code repositories with the community
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Upload Mode Selection */}
            <Tabs value={uploadMode} onValueChange={(value) => setUploadMode(value as UploadMode)}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="file" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload File
                </TabsTrigger>
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Add Link
                </TabsTrigger>
              </TabsList>

              <TabsContent value="file" className="space-y-4">
                {/* File Upload */}
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
                    }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {file ? (
                    <>
                      <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          {detectedResourceType && getResourceTypeIcon(detectedResourceType)}
                          <div className="text-left">
                            <p className="font-medium">{file.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatBytes(file.size)}
                              {detectedResourceType && (
                                <span className="ml-2 px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                                  {detectedResourceType}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setFile(null)
                            setDetectedResourceType(null)
                            setFileMetadata(null)
                            setValidationResult(null)
                            form.setValue('resource_type', undefined)
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Metadata Loading */}
                      {metadataLoading && (
                        <div className="flex items-center justify-center p-4 border rounded-lg mt-4">
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          <span className="text-sm text-muted-foreground">Extracting metadata...</span>
                        </div>
                      )}

                      {/* File Metadata Display */}
                      {fileMetadata && !metadataLoading && (
                        <div className="border rounded-lg p-4 bg-muted/50 mt-4">
                          <h4 className="font-medium text-sm mb-2">File Information</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {fileMetadata.duration && (
                              <div>
                                <span className="text-muted-foreground">Duration:</span>
                                <span className="ml-1">{Math.floor(fileMetadata.duration / 60)}:{(fileMetadata.duration % 60).toString().padStart(2, '0')}</span>
                              </div>
                            )}
                            {fileMetadata.resolution && (
                              <div>
                                <span className="text-muted-foreground">Resolution:</span>
                                <span className="ml-1">{fileMetadata.resolution.width}x{fileMetadata.resolution.height}</span>
                              </div>
                            )}
                            {fileMetadata.linesOfCode && (
                              <div>
                                <span className="text-muted-foreground">Lines of Code:</span>
                                <span className="ml-1">{fileMetadata.linesOfCode}</span>
                              </div>
                            )}
                            {fileMetadata.language && (
                              <div>
                                <span className="text-muted-foreground">Language:</span>
                                <span className="ml-1">{fileMetadata.language}</span>
                              </div>
                            )}
                            {fileMetadata.estimatedTime && (
                              <div>
                                <span className="text-muted-foreground">Est. Time:</span>
                                <span className="ml-1">{fileMetadata.estimatedTime} min</span>
                              </div>
                            )}
                            {fileMetadata.pageCount && (
                              <div>
                                <span className="text-muted-foreground">Pages:</span>
                                <span className="ml-1">{fileMetadata.pageCount}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        Drag and drop your file here, or
                      </p>
                      <Input
                        type="file"
                        className="hidden"
                        id="file-upload"
                        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                        accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,.rar,.jpg,.jpeg,.png,.mp4,.avi,.mov,.wmv,.flv,.webm,.mkv,.js,.ts,.py,.java,.cpp,.c,.html,.css,.json,.xml,.sql"
                      />
                      <label htmlFor="file-upload">
                        <Button type="button" variant="secondary" className="mt-2" asChild>
                          <span>Browse Files</span>
                        </Button>
                      </label>
                      <p className="mt-2 text-xs text-gray-500">
                        Documents, Videos, Code files up to 500MB
                      </p>
                    </>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-4">
                {/* URL Input */}
                <div className="space-y-4">
                  <div>
                    <Input
                      placeholder="Enter URL (YouTube, GitHub, articles, etc.)"
                      value={url}
                      onChange={(e) => handleUrlChange(e.target.value)}
                      disabled={loading}
                    />
                    {form.formState.errors.external_url && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.external_url.message}
                      </p>
                    )}
                  </div>

                  {/* Link Preview */}
                  {previewLoading && (
                    <div className="flex items-center justify-center p-4 border rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm text-muted-foreground">Generating preview...</span>
                    </div>
                  )}

                  {linkPreview && !previewLoading && (
                    <div className="border rounded-lg p-4 bg-muted/50">
                      <div className="flex items-start gap-3">
                        {detectedResourceType && getResourceTypeIcon(detectedResourceType)}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{linkPreview.title}</h4>
                          {linkPreview.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {linkPreview.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            {linkPreview.favicon && (
                              <img src={linkPreview.favicon} alt="" className="h-4 w-4" />
                            )}
                            <span className="text-xs text-muted-foreground truncate">
                              {new URL(url).hostname}
                            </span>
                            {detectedResourceType && (
                              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded">
                                {detectedResourceType}
                              </span>
                            )}
                          </div>
                        </div>
                        {linkPreview.thumbnail && (
                          <img
                            src={linkPreview.thumbnail}
                            alt=""
                            className="h-16 w-16 object-cover rounded"
                          />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Show fallback if preview failed but URL is valid */}
                  {!linkPreview && !previewLoading && url && validationResult?.isValid && (
                    <LinkPreviewFallback
                      url={url}
                      title={form.getValues('title') || undefined}
                      onRetry={() => handleUrlChange(url)}
                    />
                  )}

                  {/* Validation Status */}
                  {validationResult && (
                    <div className="border rounded-lg p-4 bg-muted/50 mt-4">
                      <h4 className="font-medium text-sm mb-2">
                        {uploadMode === 'file' ? 'File' : 'URL'} Validation Status
                      </h4>

                      {validationResult.isValid ? (
                        <div className="flex items-center gap-2 text-green-600 text-sm">
                          <div className="h-2 w-2 bg-green-600 rounded-full"></div>
                          {uploadMode === 'file' ? 'File passed all security checks' : 'URL passed all security checks'}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-red-600 text-sm">
                          <div className="h-2 w-2 bg-red-600 rounded-full"></div>
                          {uploadMode === 'file' ? 'File failed validation' : 'URL failed validation'}
                        </div>
                      )}

                      {validationResult.warnings.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-amber-600 font-medium">Warnings:</p>
                          <ul className="text-xs text-amber-600 list-disc list-inside">
                            {validationResult.warnings.map((warning, index) => (
                              <li key={index}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {validationResult.securityFlags.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-orange-600 font-medium">Security Flags:</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {validationResult.securityFlags.map((flag, index) => (
                              <span key={index} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                                {flag.replace(/_/g, ' ')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <Input
                  placeholder="Resource Title"
                  {...form.register('title')}
                  disabled={loading}
                />
                {form.formState.errors.title && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>

              <div>
                <Textarea
                  placeholder="Description (optional)"
                  {...form.register('description')}
                  disabled={loading}
                  rows={3}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Select
                    value={form.watch('department')}
                    onValueChange={(value) => form.setValue('department', value)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Department" />
                    </SelectTrigger>
                    <SelectContent>
                      {getDepartments().map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.department && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.department.message}
                    </p>
                  )}
                </div>

                <div>
                  <Input
                    placeholder="Course (e.g., BCA, BSc CS)"
                    {...form.register('course')}
                    disabled={loading}
                  />
                  {form.formState.errors.course && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.course.message}
                    </p>
                  )}
                </div>

                <div>
                  <Select
                    value={form.watch('semester')}
                    onValueChange={(value) => form.setValue('semester', value)}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <SelectItem key={sem} value={sem.toString()}>
                          Semester {sem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.semester && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.semester.message}
                    </p>
                  )}
                </div>

                <div>
                  <Input
                    placeholder="Subject"
                    {...form.register('subject')}
                    disabled={loading}
                  />
                  {form.formState.errors.subject && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.subject.message}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <Input
                  placeholder="Topic (optional)"
                  {...form.register('topic')}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Tags Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                <label className="text-sm font-medium">Tags</label>
                {tagsLoading && <Loader2 className="h-3 w-3 animate-spin" />}
              </div>

              <TagInput
                tags={tags}
                onTagsChange={(newTags) => {
                  const normalizedTags = newTags.map(normalizeTag).filter(Boolean)
                  setTags(normalizedTags)
                  form.setValue('tags', normalizedTags)
                }}
                suggestions={[
                  ...existingTags,
                  ...tagSuggestions.map(s => s.tag)
                ]}
                placeholder="Add tags to help others find your resource..."
                maxTags={8}
                disabled={loading}
              />

              {/* Tag Suggestions */}
              {tagSuggestions.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Suggested tags:</p>
                  <div className="flex flex-wrap gap-1">
                    {tagSuggestions.slice(0, 6).map((suggestion) => (
                      <Button
                        key={suggestion.tag}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          if (!tags.includes(suggestion.tag) && tags.length < 8) {
                            const newTags = [...tags, suggestion.tag]
                            setTags(newTags)
                            form.setValue('tags', newTags)
                          }
                        }}
                        disabled={tags.includes(suggestion.tag) || tags.length >= 8}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {suggestion.tag}
                        {suggestion.source === 'popular' && suggestion.count && (
                          <span className="ml-1 text-xs opacity-60">({suggestion.count})</span>
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Resource Type Override */}
            {detectedResourceType && (
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {getResourceTypeIcon(detectedResourceType)}
                  <span className="text-sm font-medium">Detected Type: {detectedResourceType}</span>
                </div>
                <Select
                  value={form.watch('resource_type') || detectedResourceType}
                  onValueChange={(value) => form.setValue('resource_type', value as ResourceType)}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Override resource type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="document">
                      <div className="flex items-center gap-2">
                        <FileIcon className="h-4 w-4" />
                        Document
                      </div>
                    </SelectItem>
                    <SelectItem value="video">
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4" />
                        Video
                      </div>
                    </SelectItem>
                    <SelectItem value="code">
                      <div className="flex items-center gap-2">
                        <Code className="h-4 w-4" />
                        Code Repository
                      </div>
                    </SelectItem>
                    <SelectItem value="link">
                      <div className="flex items-center gap-2">
                        <Link className="h-4 w-4" />
                        Web Link
                      </div>
                    </SelectItem>
                    <SelectItem value="article">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Article
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={
                loading ||
                (uploadMode === 'file' && !file) ||
                (uploadMode === 'url' && !url) ||
                Boolean(validationResult && validationResult.isValid === false)
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {uploadMode === 'file' ? 'Uploading...' : 'Adding...'}
                </>
              ) : (
                <>
                  {uploadMode === 'file' ? (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Resource
                    </>
                  ) : (
                    <>
                      <Link className="mr-2 h-4 w-4" />
                      Add Link
                    </>
                  )}
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </UploadErrorBoundary>
  )
}