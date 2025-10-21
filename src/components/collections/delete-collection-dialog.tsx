'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'

interface DeleteCollectionDialogProps {
  collection: Collection
  isOpen: boolean
  onClose: () => void
  onDelete?: () => void
}

export function DeleteCollectionDialog({ 
  collection, 
  isOpen, 
  onClose,
  onDelete 
}: DeleteCollectionDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [confirmationText, setConfirmationText] = useState('')

  const resourceCount = collection.resources?.length || 0
  const isConfirmed = confirmationText === collection.title

  const handleDelete = async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to delete collections',
        variant: 'destructive',
      })
      return
    }

    if (!isConfirmed) {
      toast({
        title: 'Confirmation required',
        description: 'Please type the collection title to confirm deletion',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      await collectionService.deleteCollection(collection.id, user.id)
      
      toast({
        title: 'Collection deleted',
        description: `"${collection.title}" has been permanently deleted`,
      })

      onDelete?.()
      onClose()
    } catch (error) {
      console.error('Error deleting collection:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete collection',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Collection
          </DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently delete the collection and remove all its data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-destructive">
                Warning: This action is permanent
              </p>
              <p className="text-sm text-muted-foreground">
                Deleting this collection will:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Permanently remove the collection "{collection.title}"</li>
                <li>Remove all {resourceCount} resource{resourceCount !== 1 ? 's' : ''} from this collection</li>
                <li>Delete any sharing settings and permissions</li>
                <li>Remove the collection from any user's saved collections</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2">
                <strong>Note:</strong> The individual resources will not be deleted and will remain available in the main library.
              </p>
            </div>
          </div>

          {/* Collection Info */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Collection Details:</h4>
            <div className="space-y-1 text-sm text-muted-foreground">
              <p><strong>Title:</strong> {collection.title}</p>
              <p><strong>Resources:</strong> {resourceCount} item{resourceCount !== 1 ? 's' : ''}</p>
              <p><strong>Visibility:</strong> {collection.is_public ? 'Public' : 'Private'}</p>
              {collection.is_collaborative && (
                <p><strong>Collaboration:</strong> Enabled</p>
              )}
              <p><strong>Created:</strong> {new Date(collection.created_at).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Confirmation Input */}
          <div className="space-y-2">
            <Label htmlFor="confirmation">
              Type <code className="bg-muted px-1 rounded text-sm">{collection.title}</code> to confirm deletion:
            </Label>
            <Input
              id="confirmation"
              placeholder={`Type "${collection.title}" here`}
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              disabled={loading}
              className={isConfirmed ? 'border-destructive' : ''}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDelete} 
            disabled={loading || !isConfirmed}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Delete Collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}