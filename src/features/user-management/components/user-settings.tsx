'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { usePreferences } from '@/features/user-management/hooks'
import { NotificationSettings } from './notification-settings'
import { RecommendationSettings } from './recommendation-settings'
import { PrivacySettings } from './privacy-settings'
import { Loader2 } from 'lucide-react'

export function UserSettings() {
  const { preferences, loading, error, updatePreferences } = usePreferences()
  const [saving, setSaving] = useState(false)

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading preferences...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-red-600">
            <p>Error loading preferences: {error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <p>No preferences found.</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Settings</CardTitle>
          <CardDescription>
            Manage your account preferences, notifications, and privacy settings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="notifications" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
            </TabsList>
            
            <TabsContent value="notifications" className="space-y-4">
              <NotificationSettings 
                settings={preferences.notification_settings}
                onUpdate={async (settings) => {
                  setSaving(true)
                  const success = await updatePreferences({
                    ...preferences,
                    notification_settings: settings
                  })
                  setSaving(false)
                  return success
                }}
                disabled={saving}
              />
            </TabsContent>
            
            <TabsContent value="recommendations" className="space-y-4">
              <RecommendationSettings 
                settings={preferences.recommendation_settings}
                onUpdate={async (settings) => {
                  setSaving(true)
                  const success = await updatePreferences({
                    ...preferences,
                    recommendation_settings: settings
                  })
                  setSaving(false)
                  return success
                }}
                disabled={saving}
              />
            </TabsContent>
            
            <TabsContent value="privacy" className="space-y-4">
              <PrivacySettings />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}