'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription 
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/lib/hooks/use-toast'
import { useAuth } from '@/features/auth'
import { collectionSharing } from '@/lib/utils/collection-sharing'
import type { Collection } from '@/types'
import { 
  Share2, Copy, Mail, Globe, Users, 
  Lock, Loader2, Check, X 
} from 'lucide-react'

interface ShareCollectionDialogProps {
  collection: Collection
  isOpen: boolean
  onClose: () => void
}

export function ShareCollectionDialog({ 
  collection, 
  isOpen, 
  onClose 
}: ShareCollectionDialogProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  
  const [shareSettings, setShareSettings] = useState({
    make_public: collection.is_public,
    enable_collaboration: collection.is_collaborative,
    user_emails: '',
    message: ''
  })

  const shareUrl = collectionSharing.getCollectionShareUrl(collection.id)

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      toast({
        title: 'Link copied',
        description: 'Collection link has been copied to clipboard',
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Could not copy link to clipboard',
        variant: 'destructive',
      })
    }
  }

  const handleShare = async () => {
    if (!user) {
      toast({
        title: 'Authentication required',
        description: 'Please sign in to share collections',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const emailList = shareSettings.user_emails
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0)

      const result = await collectionSharing.shareCollection(
        collection.id,
        user.id,
        {
          make_public: shareSettings.make_public,
          enable_collaboration: shareSettings.enable_collaboration,
          user_emails: emailList.length > 0 ? emailList : undefined,
          message: shareSettings.message.trim() || undefined
        }
      )

      if (result.success) {
        toast({
          title: 'Collection shared successfully',
          description: result.shared_with.length > 0 
            ? `Shared with ${result.shared_with.length} user(s)`
            : 'Collection settings updated',
        })
        onClose()
      } else {
        toast({
          title: 'Sharing failed',
          description: result.errors.join(', '),
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error sharing collection:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to share collection',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getVisibilityStatus = () => {
    if (shareSettings.make_public) {
      return shareSettings.enable_collaboration 
        ? { icon: Users, text: 'Public & Collaborative', color: 'text-green-600' }
        : { icon: Globe, text: 'Public', color: 'text-blue-600' }
    }
    return { icon: Lock, text: 'Private', color: 'text-gray-600' }
  }

  const visibilityStatus = getVisibilityStatus()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share Collection
          </DialogTitle>
          <DialogDescription>
            Share "{collection.title}" with others or make it publicly available
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <visibilityStatus.icon className={`h-4 w-4 ${visibilityStatus.color}`} />
                Current Status: {visibilityStatus.text}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm font-mono break-all">{shareUrl}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyUrl}
                    className="ml-2 flex-shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Anyone with this link can {collection.is_public ? 'view' : 'not access'} this collection
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Visibility Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visibility Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="make_public"
                  checked={shareSettings.make_public}
                  onCheckedChange={(checked) => 
                    setShareSettings(prev => ({ ...prev, make_public: !!checked }))
                  }
                  disabled={loading}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label 
                    htmlFor="make_public"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Make collection public
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Anyone with the link can view this collection
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable_collaboration"
                  checked={shareSettings.enable_collaboration}
                  onCheckedChange={(checked) => 
                    setShareSettings(prev => ({ ...prev, enable_collaboration: !!checked }))
                  }
                  disabled={loading || !shareSettings.make_public}
                />
                <div className="grid gap-1.5 leading-none">
                  <Label 
                    htmlFor="enable_collaboration"
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

          {/* Invite Specific Users */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Invite Specific Users
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user_emails">Email Addresses</Label>
                <Input
                  id="user_emails"
                  placeholder="Enter email addresses separated by commas"
                  value={shareSettings.user_emails}
                  onChange={(e) => setShareSettings(prev => ({ ...prev, user_emails: e.target.value }))}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Users will receive a notification about the shared collection
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Personal Message (Optional)</Label>
                <Textarea
                  id="message"
                  placeholder="Add a personal message to your invitation"
                  value={shareSettings.message}
                  onChange={(e) => setShareSettings(prev => ({ ...prev, message: e.target.value }))}
                  disabled={loading}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview */}
          {(shareSettings.make_public !== collection.is_public || 
            shareSettings.enable_collaboration !== collection.is_collaborative ||
            shareSettings.user_emails.trim()) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Changes Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {shareSettings.make_public !== collection.is_public && (
                    <div className="flex items-center gap-2 text-sm">
                      {shareSettings.make_public ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Will become public
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          Will become private
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {shareSettings.enable_collaboration !== collection.is_collaborative && (
                    <div className="flex items-center gap-2 text-sm">
                      {shareSettings.enable_collaboration ? (
                        <Badge variant="default" className="bg-blue-100 text-blue-800">
                          Will allow collaboration
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          Will disable collaboration
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {shareSettings.user_emails.trim() && (
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">
                        Will notify {shareSettings.user_emails.split(',').filter(e => e.trim()).length} user(s)
                      </Badge>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleShare} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Share Collection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}