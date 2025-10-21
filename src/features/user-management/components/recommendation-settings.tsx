'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { UserPreferences } from '@/types'
import { Brain, Activity } from 'lucide-react'

interface RecommendationSettingsProps {
  settings: UserPreferences['recommendation_settings']
  onUpdate: (settings: UserPreferences['recommendation_settings']) => Promise<boolean>
  disabled?: boolean
}

export function RecommendationSettings({ settings, onUpdate, disabled }: RecommendationSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings)
  const [saving, setSaving] = useState(false)

  const handleSettingChange = (key: keyof UserPreferences['recommendation_settings'], value: boolean) => {
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
            <Brain className="h-5 w-5" />
            Recommendation Settings
          </CardTitle>
          <CardDescription>
            Control how the platform personalizes content recommendations for you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="enable_recommendations"
                checked={localSettings.enable_recommendations}
                onCheckedChange={(checked) => 
                  handleSettingChange('enable_recommendations', checked as boolean)
                }
                disabled={disabled}
              />
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="enable_recommendations" className="text-sm font-medium">
                  Enable Personalized Recommendations
                </Label>
              </div>
            </div>
            <p className="text-sm text-muted-foreground ml-7">
              Show personalized resource recommendations on your dashboard based on your interests and activity.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="track_interactions"
                checked={localSettings.track_interactions}
                onCheckedChange={(checked) => 
                  handleSettingChange('track_interactions', checked as boolean)
                }
                disabled={disabled || !localSettings.enable_recommendations}
              />
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="track_interactions" className="text-sm font-medium">
                  Track Interactions for Better Recommendations
                </Label>
              </div>
            </div>
            <p className="text-sm text-muted-foreground ml-7">
              Allow the platform to track your interactions (views, downloads, searches) to improve recommendation quality.
              This data is used anonymously and helps suggest more relevant content.
            </p>
          </div>

          {!localSettings.enable_recommendations && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Brain className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">
                    Recommendations Disabled
                  </h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    You won't see personalized content recommendations on your dashboard. 
                    You can still browse and search for resources manually.
                  </p>
                </div>
              </div>
            </div>
          )}

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