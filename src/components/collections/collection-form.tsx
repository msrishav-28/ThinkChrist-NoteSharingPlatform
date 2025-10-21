'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { TagInput } from '@/components/ui/tag-input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog'
import { useToast } from '@/lib/hooks/use-toast'
import { useAuth } from '@/features/auth'
import { collectionService } from '@/lib/services/collection-service'
import type { Collection } from '@/types'
import type { CreateCollectionData, UpdateCollectionData } from '@/lib/services/collection-service'
import { Loader2, Plus, Edit3 } from 'lucide-react'

interface CollectionFormProps {
  collection?: Collection
  isOpen: boolean
  onClose: () => void
  onSuccess?: (collection: Collection) => void
  trigger?: React.ReactNode
}

export function CollectionForm({ 
  collection, 
  isOpen, 
  onClose, 
  onSuccess,
  trigger 
}: CollectionFormProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    title: collection?.title || '',
    description: collection?.description || '',
    is_public: collection?.is_public || false,
    is_collaborative: collection?.is_collaborative || false,
    tags: collection?.tags || []
  })

  const isEditing = !!collection

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to create collections',
        variant: 'destructive',
      })
      return
    }

    if (!formData.title.trim()) {
      toast({
        title: 'Title required',
        description: 'Please enter a title for your collection',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      let result: Collection

      if (isEditing) {
        const updateData: UpdateCollectionData = {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          is_public: formData.is_public,
          is_collaborative: formData.is_collaborative,
          tags: formData.tags
        }
        result = await collectionService.updateCollection(collection.id, updateData, user.id)
      } else {
        const createData: CreateCollectionData = {
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          is_public: formData.is_public,
          is_collaborative: formData.is_collaborative,
          tags: formData.tags
        }
        result = await collectionService.createCollection(createData, user.id)
      }

      toast({
        title: isEditing ? 'Collection updated' : 'Collection created',
        description: `"${result.title}" has been ${isEditing ? 'updated' : 'created'} successfully`,
      })

      onSuccess?.(result)
      onClose()

      // Navigate to the collection if it's a new one
      if (!isEditing) {
        router.push(`/collections/${result.id}`)
      }

    } catch (error) {
      console.error('Error saving collection:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save collection',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTagsChange = (tags: string[]) => {
    setFormData(prev => ({ ...prev, tags }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      {trigger}
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Edit3 className="h-5 w-5" />
                Edit Collection
              </>
            ) : (
              <>
                <Plus className="h-5 w-5" />
                Create New Collection
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'Update your collection details and settings'
              : 'Create a new collection to organize and share resources'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter collection title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                disabled={loading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe what this collection is about (optional)"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <TagInput
                tags={formData.tags}
                onTagsChange={handleTagsChange}
                placeholder="Add tags to help others discover your collection"
                disabled={loading}
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Visibility & Collaboration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_public"
                    checked={formData.is_public}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, is_public: !!checked }))
                    }
                    disabled={loading}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label 
                      htmlFor="is_public"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Make this collection public
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Public collections can be discovered and viewed by anyone
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_collaborative"
                    checked={formData.is_collaborative}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, is_collaborative: !!checked }))
                    }
                    disabled={loading}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label 
                      htmlFor="is_collaborative"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Allow collaboration
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Others can add and organize resources in this collection
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? 'Update Collection' : 'Create Collection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Convenience component for creating new collections
export function CreateCollectionButton({ 
  onSuccess, 
  className 
}: { 
  onSuccess?: (collection: Collection) => void
  className?: string 
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <CollectionForm
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      onSuccess={onSuccess}
      trigger={
        <Button 
          onClick={() => setIsOpen(true)}
          className={className}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Collection
        </Button>
      }
    />
  )
}