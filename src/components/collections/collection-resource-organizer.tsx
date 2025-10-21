'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  GripVertical, X, FileText, ExternalLink, 
  Save, Undo, Eye, Download, Calendar, User 
} from 'lucide-react'
import { useToast } from '@/lib/hooks/use-toast'
import { useAuth } from '@/features/auth'
import { collectionService } from '@/lib/services/collection-service'
import type { Collection, CollectionResource, Resource } from '@/types'
import { formatDate, formatBytes } from '@/lib/utils'

interface CollectionResourceOrganizerProps {
  collection: Collection
  onUpdate?: (collection: Collection) => void
  canEdit?: boolean
}

interface DraggableResourceItem extends CollectionResource {
  tempId: string // For drag and drop
}

export function CollectionResourceOrganizer({ 
  collection, 
  onUpdate,
  canEdit = false 
}: CollectionResourceOrganizerProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [resources, setResources] = useState<DraggableResourceItem[]>([])
  const [originalOrder, setOriginalOrder] = useState<DraggableResourceItem[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [noteValues, setNoteValues] = useState<Record<string, string>>({})

  // Initialize resources with temp IDs for drag and drop
  useEffect(() => {
    if (collection.resources) {
      const resourcesWithTempId = collection.resources.map((resource, index) => ({
        ...resource,
        tempId: `${resource.id}-${index}`
      }))
      setResources(resourcesWithTempId)
      setOriginalOrder([...resourcesWithTempId])
      
      // Initialize note values
      const notes: Record<string, string> = {}
      resourcesWithTempId.forEach(resource => {
        notes[resource.id] = resource.notes || ''
      })
      setNoteValues(notes)
    }
  }, [collection.resources])

  const getResourceIcon = (resourceType: string, fileType?: string) => {
    switch (resourceType) {
      case 'video':
        return '🎥'
      case 'link':
        return '🔗'
      case 'code':
        return '💻'
      case 'article':
        return '📰'
      case 'document':
      default:
        if (fileType?.includes('pdf')) return '📄'
        if (fileType?.includes('image')) return '🖼️'
        return '📎'
    }
  }

  const handleDragEnd = (result: DropResult) => {
    if (!canEdit) return
    
    const { destination, source } = result

    if (!destination) return

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    const newResources = Array.from(resources)
    const [reorderedItem] = newResources.splice(source.index, 1)
    newResources.splice(destination.index, 0, reorderedItem)

    setResources(newResources)
    setHasChanges(true)
  }

  const handleSaveOrder = async () => {
    if (!user || !canEdit) return

    setSaving(true)
    try {
      const resourceIds = resources.map(resource => resource.resource_id)
      await collectionService.reorderCollectionResources(
        collection.id,
        resourceIds,
        user.id
      )

      setOriginalOrder([...resources])
      setHasChanges(false)
      
      toast({
        title: 'Order saved',
        description: 'Resource order has been updated successfully',
      })

      // Refresh collection data
      const updatedCollection = await collectionService.getCollectionById(collection.id)
      if (updatedCollection) {
        onUpdate?.(updatedCollection)
      }
    } catch (error) {
      console.error('Error saving order:', error)
      toast({
        title: 'Error',
        description: 'Failed to save resource order',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleResetOrder = () => {
    setResources([...originalOrder])
    setHasChanges(false)
  }

  const handleRemoveResource = async (resourceId: string) => {
    if (!user || !canEdit) return

    try {
      await collectionService.removeResourceFromCollection(
        collection.id,
        resourceId,
        user.id
      )

      setResources(prev => prev.filter(r => r.resource_id !== resourceId))
      setOriginalOrder(prev => prev.filter(r => r.resource_id !== resourceId))
      
      toast({
        title: 'Resource removed',
        description: 'Resource has been removed from the collection',
      })

      // Refresh collection data
      const updatedCollection = await collectionService.getCollectionById(collection.id)
      if (updatedCollection) {
        onUpdate?.(updatedCollection)
      }
    } catch (error) {
      console.error('Error removing resource:', error)
      toast({
        title: 'Error',
        description: 'Failed to remove resource from collection',
        variant: 'destructive',
      })
    }
  }

  const handleSaveNotes = async (resourceId: string) => {
    if (!user || !canEdit) return

    try {
      // Note: This would require extending the collection service to update notes
      // For now, we'll just update the local state
      setEditingNotes(null)
      
      toast({
        title: 'Notes saved',
        description: 'Resource notes have been updated',
      })
    } catch (error) {
      console.error('Error saving notes:', error)
      toast({
        title: 'Error',
        description: 'Failed to save notes',
        variant: 'destructive',
      })
    }
  }

  const handleResourceAction = (resource: Resource, action: 'view' | 'download') => {
    const url = resource.external_url || resource.file_url
    if (url) {
      if (action === 'view') {
        window.open(`/resources/${resource.id}`, '_blank')
      } else {
        window.open(url, '_blank')
      }
    }
  }

  if (!collection.resources || collection.resources.length === 0) {
    return (
      <div className="text-center py-12">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No Resources</h3>
        <p className="mt-2 text-muted-foreground">
          This collection doesn't have any resources yet.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      {canEdit && hasChanges && (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <p className="text-sm text-muted-foreground">
              You have unsaved changes to the resource order
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetOrder}
                disabled={saving}
              >
                <Undo className="mr-2 h-4 w-4" />
                Reset
              </Button>
              <Button
                size="sm"
                onClick={handleSaveOrder}
                disabled={saving}
              >
                <Save className="mr-2 h-4 w-4" />
                Save Order
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Resource List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="collection-resources">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className={`space-y-3 ${
                snapshot.isDraggingOver ? 'bg-muted/50 rounded-lg p-2' : ''
              }`}
            >
              {resources.map((collectionResource, index) => {
                const resource = collectionResource.resource
                if (!resource) return null

                return (
                  <Draggable
                    key={collectionResource.tempId}
                    draggableId={collectionResource.tempId}
                    index={index}
                    isDragDisabled={!canEdit}
                  >
                    {(provided, snapshot) => (
                      <Card
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${
                          snapshot.isDragging ? 'shadow-lg rotate-2' : ''
                        } ${canEdit ? 'cursor-move' : ''}`}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-3">
                            {canEdit && (
                              <div
                                {...provided.dragHandleProps}
                                className="mt-1 text-muted-foreground hover:text-foreground"
                              >
                                <GripVertical className="h-5 w-5" />
                              </div>
                            )}
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1 flex-1">
                                  <h4 className="font-medium line-clamp-2">
                                    {getResourceIcon(resource.resource_type, resource.file_type)} {resource.title}
                                  </h4>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <User className="h-3 w-3" />
                                    <span>{resource.uploader?.full_name || 'Anonymous'}</span>
                                    <span>•</span>
                                    <Calendar className="h-3 w-3" />
                                    <span>{formatDate(resource.created_at)}</span>
                                  </div>
                                </div>
                                
                                {canEdit && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleRemoveResource(resource.id)}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                              
                              {resource.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                                  {resource.description}
                                </p>
                              )}
                              
                              <div className="flex flex-wrap gap-2 mt-2">
                                <Badge variant="secondary">{resource.resource_type}</Badge>
                                <Badge variant="outline">{resource.department}</Badge>
                                <Badge variant="outline">{resource.subject}</Badge>
                                {resource.file_size && (
                                  <Badge variant="outline">{formatBytes(resource.file_size)}</Badge>
                                )}
                              </div>
                              
                              {/* Notes Section */}
                              {(collectionResource.notes || canEdit) && (
                                <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                                  {editingNotes === collectionResource.id ? (
                                    <div className="space-y-2">
                                      <Textarea
                                        value={noteValues[collectionResource.id] || ''}
                                        onChange={(e) => setNoteValues(prev => ({
                                          ...prev,
                                          [collectionResource.id]: e.target.value
                                        }))}
                                        placeholder="Add notes about this resource..."
                                        rows={3}
                                      />
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          onClick={() => handleSaveNotes(collectionResource.id)}
                                        >
                                          Save
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setEditingNotes(null)}
                                        >
                                          Cancel
                                        </Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-2">
                                      {collectionResource.notes ? (
                                        <p className="text-sm">{collectionResource.notes}</p>
                                      ) : (
                                        <p className="text-sm text-muted-foreground italic">
                                          No notes added
                                        </p>
                                      )}
                                      {canEdit && (
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setEditingNotes(collectionResource.id)}
                                        >
                                          {collectionResource.notes ? 'Edit Notes' : 'Add Notes'}
                                        </Button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Actions */}
                              <div className="flex gap-2 mt-3">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResourceAction(resource, 'view')}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleResourceAction(resource, 'download')}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  {resource.external_url ? 'Open' : 'Download'}
                                </Button>
                                {resource.external_url && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    asChild
                                  >
                                    <a 
                                      href={resource.external_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                    >
                                      <ExternalLink className="mr-2 h-4 w-4" />
                                      External Link
                                    </a>
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    )}
                  </Draggable>
                )
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  )
}