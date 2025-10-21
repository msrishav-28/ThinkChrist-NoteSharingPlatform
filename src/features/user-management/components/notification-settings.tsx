'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { UserPreferences } from '@/types'
import { Bell, Mail, Trophy, ThumbsUp } from 'lucide-react'

interface NotificationSettingsProps {
  settings: UserPreferences['notification_settings']
  onUpdate: (settings: UserPreferences['notification_settings']) => Promise<boolean>
  disabled?: boolean
}

export function NotificationSettings({ settings, onUpdate, disabled }: NotificationSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings)
  const [saving, setSaving] = useState(false)

  const handleSettingChange = (key: keyof UserPreferences['notification_settings'], value: boolean) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    const success = await onUpdate(localSettings)
    setSaving(false)
    
    if (!success) {
      // Reset to original settings on failure
      setLocalSettings(settings)
    }
  }

  const hasChanges = JSON.stringify(localSettings) !== JSON.stringify(settings)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose what notifications you want to receive and how you want to receive them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="email_digest"
                checked={localSettings.email_digest}
                onCheckedChange={(checked) => 
                  handleSettingChange('email_digest', checked as boolean)
                }
                disabled={disabled}
              />
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="email_digest" className="text-sm font-medium">
                  Email Digest
                </Label>
              </div>
            </div>
            <p className="text-sm text-muted-foreground ml-7">
              Receive weekly email summaries of new resources and activity in your departments.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="new_resources"
                checked={localSettings.new_resources}
                onCheckedChange={(checked) => 
                  handleSettingChange('new_resources', checked as boolean)
                }
                disabled={disabled}
              />
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="new_resources" className="text-sm font-medium">
                  New Resources
                </Label>
              </div>
            </div>
            <p className="text-sm text-muted-foreground ml-7">
              Get notified when new resources are uploaded in your courses and departments.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="votes_received"
                checked={localSettings.votes_received}
                onCheckedChange={(checked) => 
                  handleSettingChange('votes_received', checked as boolean)
                }
                disabled={disabled}
              />
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="votes_received" className="text-sm font-medium">
                  Votes Received
                </Label>
              </div>
            </div>
            <p className="text-sm text-muted-foreground ml-7">
              Get notified when someone upvotes or downvotes your resources.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="achievements"
                checked={localSettings.achievements}
                onCheckedChange={(checked) => 
                  handleSettingChange('achievements', checked as boolean)
                }
                disabled={disabled}
              />
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="achievements" className="text-sm font-medium">
                  Achievements
                </Label>
              </div>
            </div>
            <p className="text-sm text-muted-foreground ml-7">
              Get notified when you earn new badges or reach point milestones.
            </p>
          </div>

          {hasChanges && (
            <div className="flex justify-end pt-4 border-t">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setLocalSettings(settings)}
                  disabled={disabled || saving}
                >
                  Reset
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={disabled || saving}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}