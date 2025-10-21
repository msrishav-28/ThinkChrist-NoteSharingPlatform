'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog'
import { 
  Mail, Check, X, Clock, Users, 
  FolderOpen, Calendar, User 
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useToast } from '@/lib/hooks/use-toast'
import { useCollaborationInvitations } from '@/lib/hooks/use-collection-collaboration'
import type { CollaborationInvitation } from '@/lib/services/collaborative-collection-service'
import { cn } from '@/lib/utils'

interface CollaborationInvitationsProps {
  className?: string
}

export function CollaborationInvitations({ className }: CollaborationInvitationsProps) {
  const { toast } = useToast()
  const { invitations, loading, acceptInvitation, declineInvitation, refresh } = useCollaborationInvitations()
  const [processingInvitation, setProcessingInvitation] = useState<string | null>(null)

  const handleAcceptInvitation = async (invitationId: string) => {
    setProcessingInvitation(invitationId)
    
    try {
      const result = await acceptInvitation(invitationId)
      
      if (result.success) {
        toast({
          title: 'Invitation accepted',
          description: 'You can now collaborate on this collection',
        })
        
        // Optionally navigate to the collection
        if (result.collection_id) {
          window.open(`/collections/${result.collection_id}`, '_blank')
        }
      } else {
        toast({
          title: 'Failed to accept invitation',
          description: result.error || 'Unknown error occurred',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to accept invitation',
        variant: 'destructive',
      })
    } finally {
      setProcessingInvitation(null)
    }
  }

  const handleDeclineInvitation = async (invitationId: string) => {
    setProcessingInvitation(invitationId)
    
    try {
      const success = await declineInvitation(invitationId)
      
      if (success) {
        toast({
          title: 'Invitation declined',
          description: 'The invitation has been declined',
        })
      } else {
        toast({
          title: 'Failed to decline invitation',
          description: 'Please try again',
          variant: 'destructive',
        })
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to decline invitation',
        variant: 'destructive',
      })
    } finally {
      setProcessingInvitation(null)
    }
  }

  const getPermissionBadge = (permissionLevel: string) => {
    switch (permissionLevel) {
      case 'admin':
        return <Badge variant="default">Admin</Badge>
      case 'edit':
        return <Badge variant="secondary">Editor</Badge>
      case 'view':
        return <Badge variant="outline">Viewer</Badge>
      default:
        return <Badge variant="outline">{permissionLevel}</Badge>
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-2 text-sm text-muted-foreground">Loading invitations...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (invitations.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No pending invitations</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Collaboration Invitations
          {invitations.length > 0 && (
            <Badge variant="secondary">{invitations.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitations.map((invitation) => (
          <InvitationCard
            key={invitation.id}
            invitation={invitation}
            onAccept={() => handleAcceptInvitation(invitation.id)}
            onDecline={() => handleDeclineInvitation(invitation.id)}
            isProcessing={processingInvitation === invitation.id}
          />
        ))}
      </CardContent>
    </Card>
  )
}

interface InvitationCardProps {
  invitation: any // CollaborationInvitation with joined data
  onAccept: () => void
  onDecline: () => void
  isProcessing: boolean
}

function InvitationCard({ invitation, onAccept, onDecline, isProcessing }: InvitationCardProps) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <>
      <div className="border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
              <h4 className="font-medium">{invitation.collection?.title || 'Untitled Collection'}</h4>
              {getPermissionBadge(invitation.permission_level)}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              <span>Invited by {invitation.inviter?.full_name || 'Someone'}</span>
              <span>•</span>
              <Calendar className="h-3 w-3" />
              <span>{formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}</span>
            </div>
            
            {invitation.message && (
              <p className="text-sm text-muted-foreground italic">
                "{invitation.message}"
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-1 ml-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              Expires {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onAccept}
            disabled={isProcessing}
            className="flex-1"
          >
            <Check className="mr-2 h-4 w-4" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDecline}
            disabled={isProcessing}
            className="flex-1"
          >
            <X className="mr-2 h-4 w-4" />
            Decline
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowDetails(true)}
          >
            Details
          </Button>
        </div>
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collaboration Invitation Details</DialogTitle>
            <DialogDescription>
              Review the details of this collaboration invitation
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Collection Information</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Title:</span>
                  <span>{invitation.collection?.title || 'Untitled Collection'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created by:</span>
                  <span>{invitation.collection?.creator?.full_name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Your role:</span>
                  <span>{getPermissionBadge(invitation.permission_level)}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Invitation Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invited by:</span>
                  <span>{invitation.inviter?.full_name || 'Someone'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sent:</span>
                  <span>{formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expires:</span>
                  <span>{formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>
            
            {invitation.message && (
              <div>
                <h4 className="font-medium mb-2">Personal Message</h4>
                <p className="text-sm bg-muted p-3 rounded-lg">
                  {invitation.message}
                </p>
              </div>
            )}
            
            <div>
              <h4 className="font-medium mb-2">What you can do</h4>
              <div className="text-sm space-y-1">
                {invitation.permission_level === 'admin' && (
                  <>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Full administrative access</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Manage collection settings and collaborators</span>
                    </div>
                  </>
                )}
                {(invitation.permission_level === 'edit' || invitation.permission_level === 'admin') && (
                  <>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Add and remove resources</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Reorder and organize content</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>Add notes and annotations</span>
                    </div>
                  </>
                )}
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <span>View all collection content</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button onClick={onAccept} disabled={isProcessing} className="flex-1">
              <Check className="mr-2 h-4 w-4" />
              Accept Invitation
            </Button>
            <Button variant="outline" onClick={onDecline} disabled={isProcessing} className="flex-1">
              <X className="mr-2 h-4 w-4" />
              Decline
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function getPermissionBadge(permissionLevel: string) {
  switch (permissionLevel) {
    case 'admin':
      return <Badge variant="default">Admin</Badge>
    case 'edit':
      return <Badge variant="secondary">Editor</Badge>
    case 'view':
      return <Badge variant="outline">Viewer</Badge>
    default:
      return <Badge variant="outline">{permissionLevel}</Badge>
  }
}