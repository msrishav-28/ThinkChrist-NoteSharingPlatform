'use client'

import { useState, useCallback } from 'react'
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
import { Upload, FileIcon, X, Loader2 } from 'lucide-react'
import { useToast } from '@/lib/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/use-auth'
import { getDepartments, formatBytes } from '@/lib/utils'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

const uploadSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  department: z.string().min(1, 'Please select a department'),
  course: z.string().min(1, 'Please enter a course'),
  semester: z.string().min(1, 'Please select a semester'),
  subject: z.string().min(1, 'Please enter a subject'),
  topic: z.string().optional(),
})

type UploadFormData = z.infer<typeof uploadSchema>

export function UploadForm() {
  const router = useRouter()
  const { toast } = useToast()
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [dragActive, setDragActive] = useState(false)
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
    },
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

  const handleFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Please select a file smaller than 50MB',
        variant: 'destructive',
      })
      return
    }
    setFile(file)
  }

  const onSubmit = async (data: UploadFormData) => {
    if (!file) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to upload',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
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

      // Create resource record
      const { data: resource, error: dbError } = await supabase
        .from('resources')
        .insert({
          ...data,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          uploaded_by: user?.id,
          semester: parseInt(data.semester),
        })
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
      toast({
        title: 'Error',
        description: 'Failed to upload resource. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Upload Resource</CardTitle>
        <CardDescription>
          Share your notes and study materials with the community
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* File Upload */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-gray-300'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <FileIcon className="h-8 w-8 text-primary" />
                  <div className="text-left">
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFile(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
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
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.zip,.rar,.jpg,.jpeg,.png"
                />
                <label htmlFor="file-upload">
                  <Button type="button" variant="secondary" className="mt-2" asChild>
                    <span>Browse Files</span>
                  </Button>
                </label>
                <p className="mt-2 text-xs text-gray-500">
                  PDF, DOC, PPT, Images, ZIP up to 50MB
                </p>
              </>
            )}
          </div>

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

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !file}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Resource
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}