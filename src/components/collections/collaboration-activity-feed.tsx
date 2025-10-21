'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Activity, Users, Plus, Minus, ArrowUpDown, 
  Edit3, UserPlus, StickyNote, Clock, User,
  ChevronDown, ChevronUp
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { CollaborationActivity, ActiveCollaborator } from '@/lib/services/collaborative-collection-service'
import { cn } from '@/lib/utils'

interface CollaborationActivityFeedProps {
  activities: CollaborationActivity[]
  activeCollaborators: ActiveCollaborator[]
  className?: string
  maxHeight?: string
}

export function CollaborationActivityFeed({ 
  activities, 
  activeCollaborators,
  className,
  maxHeight = "400px"
}: CollaborationActivityFeedProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showAllActivities, setShowAllActivities] = useState(false)

  const getActivityIcon = (activityType: string) => {
    switch (activityType) {
      case 'resource_added':
        return <Plus className="h-4 w-4 text-green-600" />
      case 'resource_removed':
        return <Minus className="h-4 w-4 text-red-600" />
      case 'resource_reordered':
        return <ArrowUpDown className="h-4 w-4 text-blue-600" />
      case 'collection_updated':
        return <Edit3 className="h-4 w-4 text-orange-600" />
      case 'user_joined':
        return <UserPlus className="h-4 w-4 text-purple-600" />
      case 'notes_updated':
        return <StickyNote className="h-4 w-4 text-indigo-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  const getActivityDescription = (activity: CollaborationActivity) => {
    const { activity_type, activity_data, user_name } = activity

    switch (activity_type) {
      case 'resource_added':
        return `${user_name} added a resource to the collection`
      case 'resource_removed':
        return `${user_name} removed a resource from the collection`
      case 'resource_reordered':
        return `${user_name} reordered resources in the collection`
      case 'collection_updated':
        const changes = activity_data.changes || {}
        const changeTypes = []
        if (changes.title_changed) changeTypes.push('title')
        if (changes.description_changed) changeTypes.push('description')
        if (changes.visibility_changed) changeTypes.push('visibility')
        if (changes.collaboration_changed) changeTypes.push('collaboration settings')
        if (changes.tags_changed) changeTypes.push('tags')
        
        return `${user_name} updated the collection${changeTypes.length > 0 ? ` (${changeTypes.join(', ')})` : ''}`
      case 'user_joined':
        return `${user_name} joined as a collaborator`
      case 'notes_updated':
        return `${user_name} ${activity_data.has_notes ? 'added' : 'removed'} notes on a resource`
      default:
        return `${user_name} performed an action`
    }
  }

  const getActivityColor = (activityType: string) => {
    switch (activityType) {
      case 'resource_added':
        return 'border-l-green-500'
      case 'resource_removed':
        return 'border-l-red-500'
      case 'resource_reordered':
        return 'border-l-blue-500'
      case 'collection_updated':
        return 'border-l-orange-500'
      case 'user_joined':
        return 'border-l-purple-500'
      case 'notes_updated':
        return 'border-l-indigo-500'
      default:
        return 'border-l-gray-500'
    }
  }

  const displayedActivities = showAllActivities ? activities : activities.slice(0, 5)

  if (activities.length === 0 && activeCollaborators.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <Activity className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">No collaboration activity yet</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Collaboration Activity
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {/* Active Collaborators */}
        {activeCollaborators.length > 0 && (
          <div className="flex items-center gap-2 pt-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-wrap gap-1">
              {activeCollaborators.slice(0, 3).map((collaborator) => (
                <Badge 
                  key={collaborator.user_id} 
                  variant={collaborator.is_online ? "default" : "secondary"}
                  className="text-xs"
                >
                  <div className={cn(
                    "w-2 h-2 rounded-full mr-1",
                    collaborator.is_online ? "bg-green-400" : "bg-gray-400"
                  )} />
                  {collaborator.user_name}
                </Badge>
              ))}
              {activeCollaborators.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{activeCollaborators.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <ScrollArea className="w-full" style={{ maxHeight }}>
            <div className="space-y-3">
              {displayedActivities.map((activity) => (
                <div
                  key={activity.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border-l-4 bg-muted/30",
                    getActivityColor(activity.activity_type)
                  )}
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getActivityIcon(activity.activity_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {getActivityDescription(activity)}
                    </p>
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>
                        {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    
                    {/* Additional activity details */}
                    {activity.activity_data && Object.keys(activity.activity_data).length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        {activity.activity_type === 'resource_reordered' && activity.activity_data.old_order && (
                          <span>
                            Moved from position {activity.activity_data.old_order} to {activity.activity_data.new_order}
                          </span>
                        )}
                        {activity.activity_type === 'collection_updated' && activity.activity_data.changes && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Object.entries(activity.activity_data.changes).map(([key, value]) => 
                              value ? (
                                <Badge key={key} variant="outline" className="text-xs">
                                  {key.replace('_changed', '').replace('_', ' ')}
                                </Badge>
                              ) : null
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {activities.length > 5 && !showAllActivities && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllActivities(true)}
                  className="w-full"
                >
                  Show {activities.length - 5} more activities
                </Button>
              )}
              
              {showAllActivities && activities.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAllActivities(false)}
                  className="w-full"
                >
                  Show less
                </Button>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      )}
    </Card>
  )
}

// Compact version for sidebars
export function CollaborationActivityIndicator({ 
  activities, 
  activeCollaborators,
  className 
}: {
  activities: CollaborationActivity[]
  activeCollaborators: ActiveCollaborator[]
  className?: string
}) {
  const recentActivity = activities[0]
  const onlineCount = activeCollaborators.filter(c => c.is_online).length

  return (
    <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
      {onlineCount > 0 && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-400" />
          <span>{onlineCount} online</span>
        </div>
      )}
      
      {recentActivity && (
        <div className="flex items-center gap-1">
          {getActivityIcon(recentActivity.activity_type)}
          <span className="truncate">
            {formatDistanceToNow(new Date(recentActivity.created_at), { addSuffix: true })}
          </span>
        </div>
      )}
      
      {!recentActivity && activeCollaborators.length === 0 && (
        <span>No recent activity</span>
      )}
    </div>
  )
}

function getActivityIcon(activityType: string) {
  switch (activityType) {
    case 'resource_added':
      return <Plus className="h-3 w-3 text-green-600" />
    case 'resource_removed':
      return <Minus className="h-3 w-3 text-red-600" />
    case 'resource_reordered':
      return <ArrowUpDown className="h-3 w-3 text-blue-600" />
    case 'collection_updated':
      return <Edit3 className="h-3 w-3 text-orange-600" />
    case 'user_joined':
      return <UserPlus className="h-3 w-3 text-purple-600" />
    case 'notes_updated':
      return <StickyNote className="h-3 w-3 text-indigo-600" />
    default:
      return <Activity className="h-3 w-3 text-gray-600" />
  }
}