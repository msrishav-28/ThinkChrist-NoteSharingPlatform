'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FolderOpen, Users, Lock, Globe, 
  Calendar, User, MoreVertical, 
  Edit3, Trash2, Share2, Eye,
  FileText
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Collection } from '@/types'
import { formatDate, cn } from '@/lib/utils'
import { useAuth } from '@/features/auth'
import { CollectionForm } from './collection-form'
import { ShareCollectionDialog } from './share-collection-dialog'
import { DeleteCollectionDialog } from './delete-collection-dialog'

interface CollectionCardProps {
  collection: Collection
  onUpdate?: (collection: Collection) => void
  onDelete?: (collectionId: string) => void
  className?: string
  showActions?: boolean
}

export function CollectionCard({ 
  collection, 
  onUpdate, 
  onDelete,
  className,
  showActions = true
}: CollectionCardProps) {
  const { user } = useAuth()
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const isOwner = user?.id === collection.created_by
  const resourceCount = collection.resources?.length || 0

  // Generate unique IDs for accessibility
  const cardId = `collection-card-${collection.id}`
  const titleId = `collection-title-${collection.id}`
  const descriptionId = `collection-description-${collection.id}`
  const metadataId = `collection-metadata-${collection.id}`

  const getVisibilityIcon = () => {
    if (collection.is_public) {
      return collection.is_collaborative ? (
        <Users className="h-4 w-4 text-green-600" />
      ) : (
        <Globe className="h-4 w-4 text-blue-600" />
      )
    }
    return <Lock className="h-4 w-4 text-gray-600" />
  }

  const getVisibilityText = () => {
    if (collection.is_public) {
      return collection.is_collaborative ? 'Public & Collaborative' : 'Public'
    }
    return 'Private'
  }

  const getVisibilityColor = () => {
    if (collection.is_public) {
      return collection.is_collaborative ? 'text-green-600' : 'text-blue-600'
    }
    return 'text-gray-600'
  }

  return (
    <>
      <Card 
        className={cn(
          "hover:shadow-lg transition-shadow focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2", 
          className
        )}
        role="article"
        aria-labelledby={titleId}
        aria-describedby={collection.description ? descriptionId : metadataId}
        id={cardId}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <Link href={`/collections/${collection.id}`}>
                <h3 
                  id={titleId}
                  className="font-semibold text-lg line-clamp-2 hover:text-primary transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md"
                >
                  <FolderOpen className="inline h-5 w-5 mr-2" aria-hidden="true" />
                  {collection.title}
                </h3>
              </Link>
              <div 
                className="flex items-center gap-2 text-sm text-muted-foreground"
                id={metadataId}
              >
                <User className="h-3 w-3" aria-hidden="true" />
                <span>
                  <span className="sr-only">Created by: </span>
                  {collection.creator?.full_name || 'Anonymous'}
                </span>
                <span aria-hidden="true">•</span>
                <Calendar className="h-3 w-3" aria-hidden="true" />
                <span>
                  <span className="sr-only">Created on: </span>
                  {formatDate(collection.created_at)}
                </span>
              </div>
            </div>
            
            {showActions && isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    aria-label={`Collection actions for ${collection.title}`}
                  >
                    <MoreVertical className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                    <Edit3 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Edit Collection
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowShareDialog(true)}>
                    <Share2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Share Collection
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                    Delete Collection
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-3">
          {collection.description && (
            <p 
              id={descriptionId}
              className="text-sm text-muted-foreground line-clamp-2"
            >
              {collection.description}
            </p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <span aria-hidden="true">{getVisibilityIcon()}</span>
              <span className={getVisibilityColor()}>
                <span className="sr-only">Visibility: </span>
                {getVisibilityText()}
              </span>
            </div>
            
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" aria-hidden="true" />
              <span>
                <span className="sr-only">Contains </span>
                {resourceCount} resource{resourceCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          
          {collection.tags && collection.tags.length > 0 && (
            <div className="flex flex-wrap gap-1" role="group" aria-label="Collection tags">
              {collection.tags.slice(0, 3).map(tag => (
                <Badge 
                  key={tag} 
                  variant="outline" 
                  className="text-xs"
                  aria-label={`Tag: ${tag}`}
                >
                  #{tag}
                </Badge>
              ))}
              {collection.tags.length > 3 && (
                <Badge 
                  variant="outline" 
                  className="text-xs"
                  aria-label={`${collection.tags.length - 3} more tags available`}
                >
                  +{collection.tags.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </CardContent>
        
        <CardFooter>
          <Link href={`/collections/${collection.id}`} className="w-full">
            <Button 
              variant="outline" 
              className="w-full"
              aria-label={`View collection: ${collection.title}`}
            >
              <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
              View Collection
            </Button>
          </Link>
        </CardFooter>
      </Card>

      {/* Edit Dialog */}
      <CollectionForm
        collection={collection}
        isOpen={showEditDialog}
        onClose={() => setShowEditDialog(false)}
        onSuccess={(updatedCollection) => {
          onUpdate?.(updatedCollection)
          setShowEditDialog(false)
        }}
      />

      {/* Share Dialog */}
      <ShareCollectionDialog
        collection={collection}
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
      />

      {/* Delete Dialog */}
      <DeleteCollectionDialog
        collection={collection}
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onDelete={() => {
          onDelete?.(collection.id)
          setShowDeleteDialog(false)
        }}
      />
    </>
  )
}

// Grid component for displaying multiple collections
interface CollectionGridProps {
  collections: Collection[]
  onUpdate?: (collection: Collection) => void
  onDelete?: (collectionId: string) => void
  className?: string
  emptyMessage?: string
}

export function CollectionGrid({ 
  collections, 
  onUpdate, 
  onDelete,
  className,
  emptyMessage = "No collections found"
}: CollectionGridProps) {
  if (collections.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No Collections</h3>
        <p className="mt-2 text-muted-foreground">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className={cn(
      "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6",
      className
    )}>
      {collections.map((collection) => (
        <CollectionCard
          key={collection.id}
          collection={collection}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}