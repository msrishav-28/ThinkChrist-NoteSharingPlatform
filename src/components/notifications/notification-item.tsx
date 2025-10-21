'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Notification } from '@/types'
import { formatDistanceToNow } from 'date-fns'
import { 
  Trophy, 
  ThumbsUp, 
  FileText, 
  Users, 
  Info, 
  Check, 
  Trash2,
  ThumbsDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

const notificationIcons = {
  achievement: Trophy,
  vote_received: ThumbsUp,
  new_resource: FileText,
  collection_shared: Users,
  system: Info,
}

const notificationColors = {
  achievement: 'text-yellow-600',
  vote_received: 'text-blue-600',
  new_resource: 'text-green-600',
  collection_shared: 'text-purple-600',
  system: 'text-gray-600',
}

export function NotificationItem({ notification, onMarkAsRead, onDelete }: NotificationItemProps) {
  const [loading, setLoading] = useState(false)
  
  const Icon = notificationIcons[notification.type as keyof typeof notificationIcons] || Info
  const iconColor = notificationColors[notification.type as keyof typeof notificationColors] || 'text-gray-600'

  const handleMarkAsRead = async () => {
    if (notification.is_read) return
    
    setLoading(true)
    await onMarkAsRead(notification.id)
    setLoading(false)
  }

  const handleDelete = async () => {
    setLoading(true)
    await onDelete(notification.id)
    setLoading(false)
  }

  const getNotificationContent = () => {
    switch (notification.type) {
      case 'vote_received':
        const voteType = notification.data?.vote_type
        const VoteIcon = voteType === 'downvote' ? ThumbsDown : ThumbsUp
        return (
          <div className="flex items-start gap-2">
            <VoteIcon className={cn('h-4 w-4 mt-0.5', voteType === 'downvote' ? 'text-red-600' : 'text-blue-600')} />
            <div>
              <p className="font-medium">{notification.title}</p>
              <p className="text-sm text-muted-foreground">{notification.message}</p>
            </div>
          </div>
        )
      
      case 'achievement':
        return (
          <div className="flex items-start gap-2">
            <Trophy className="h-4 w-4 mt-0.5 text-yellow-600" />
            <div>
              <p className="font-medium">{notification.title}</p>
              <p className="text-sm text-muted-foreground">{notification.message}</p>
              {notification.data?.points && (
                <Badge variant="secondary" className="mt-1">
                  +{notification.data.points} points
                </Badge>
              )}
            </div>
          </div>
        )
      
      default:
        return (
          <div className="flex items-start gap-2">
            <Icon className={cn('h-4 w-4 mt-0.5', iconColor)} />
            <div>
              <p className="font-medium">{notification.title}</p>
              {notification.message && (
                <p className="text-sm text-muted-foreground">{notification.message}</p>
              )}
            </div>
          </div>
        )
    }
  }

  return (
    <Card 
      className={cn(
        'transition-all duration-200 hover:shadow-md cursor-pointer',
        !notification.is_read && 'border-l-4 border-l-blue-500 bg-blue-50/50'
      )}
      onClick={handleMarkAsRead}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {getNotificationContent()}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
              </span>
              {!notification.is_read && (
                <Badge variant="secondary" className="text-xs">
                  New
                </Badge>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {!notification.is_read && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  handleMarkAsRead()
                }}
                disabled={loading}
                className="h-8 w-8 p-0"
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleDelete()
              }}
              disabled={loading}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}