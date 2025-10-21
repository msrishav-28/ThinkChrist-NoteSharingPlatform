'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Shield, Eye, Database, Download } from 'lucide-react'
import { useAuth } from '@/features/auth'
import { userInteractionTrackingService } from '@/lib/services/user-interaction-tracking'
import { DatabaseUtils } from '@/lib/database-utils'
import type { UserPreferences } from '@/types'

interface PrivacySettings {
  trackInteractions: boolean
  trackDetailedMetadata: boolean
  shareAnalyticsData: boolean
  retentionPeriodDays: number
}

export function PrivacySettings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState<PrivacySettings>({
    trackInteractions: true,
    trackDetailedMetadata: true,
    shareAnalyticsData: false,
    retentionPeriodDays: 365
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Load current privacy settings
  useEffect(() => {
    async function loadSettings() {
      if (!user?.id) return

      try {
        const preferences = await DatabaseUtils.getUserPreferences(user.id)
        const privacySettings = preferences?.privacy_settings || {}

        setSettings({
          trackInteractions: (privacySettings as any).trackInteractions ?? true,
          trackDetailedMetadata: (privacySettings as any).trackDetailedMetadata ?? true,
          shareAnalyticsData: (privacySettings as any).shareAnalyticsData ?? false,
          retentionPeriodDays: (privacySettings as any).retentionPeriodDays ?? 365
        })
      } catch (error) {
        console.error('Error loading privacy settings:', error)
        setMessage({ type: 'error', text: 'Failed to load privacy settings' })
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [user?.id])

  const handleSaveSettings = async () => {
    if (!user?.id) return

    setIsSaving(true)
    setMessage(null)

    try {
      await userInteractionTrackingService.updateUserPrivacySettings(user.id, settings)
      setMessage({ type: 'success', text: 'Privacy settings updated successfully' })
    } catch (error) {
      console.error('Error saving privacy settings:', error)
      setMessage({ type: 'error', text: 'Failed to save privacy settings' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportData = async () => {
    if (!user?.id) return

    try {
      const interactionData = await userInteractionTrackingService.exportUserInteractionData(user.id)
      
      // Create and download JSON file
      const dataBlob = new Blob([JSON.stringify(interactionData, null, 2)], {
        type: 'application/json'
      })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `interaction-data-${user.id}-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setMessage({ type: 'success', text: 'Interaction data exported successfully' })
      setShowExportDialog(false)
    } catch (error) {
      console.error('Error exporting data:', error)
      setMessage({ type: 'error', text: 'Failed to export interaction data' })
    }
  }

  const handleDeleteData = async () => {
    if (!user?.id) return

    try {
      await userInteractionTrackingService.deleteUserInteractionData(user.id)
      setMessage({ type: 'success', text: 'All interaction data deleted successfully' })
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Error deleting data:', error)
      setMessage({ type: 'error', text: 'Failed to delete interaction data' })
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading privacy settings...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Data Settings
          </CardTitle>
          <CardDescription>
            Control how your interaction data is collected and used to improve your experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {message && (
            <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
              <AlertDescription className={message.type === 'error' ? 'text-red-800' : 'text-green-800'}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            {/* Basic Interaction Tracking */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="track-interactions" className="text-base font-medium">
                  Enable Interaction Tracking
                </Label>
                <p className="text-sm text-muted-foreground">
                  Allow the platform to track your interactions to provide personalized recommendations.
                </p>
              </div>
              <Switch
                id="track-interactions"
                checked={settings.trackInteractions}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, trackInteractions: checked }))
                }
              />
            </div>

            {/* Detailed Metadata Tracking */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="track-metadata" className="text-base font-medium">
                  Detailed Metadata Collection
                </Label>
                <p className="text-sm text-muted-foreground">
                  Collect additional data like view duration and scroll behavior for better insights.
                </p>
              </div>
              <Switch
                id="track-metadata"
                checked={settings.trackDetailedMetadata}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, trackDetailedMetadata: checked }))
                }
                disabled={!settings.trackInteractions}
              />
            </div>

            {/* Analytics Data Sharing */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="share-analytics" className="text-base font-medium">
                  Share Anonymous Analytics
                </Label>
                <p className="text-sm text-muted-foreground">
                  Help improve the platform by sharing anonymized usage patterns.
                </p>
              </div>
              <Switch
                id="share-analytics"
                checked={settings.shareAnalyticsData}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, shareAnalyticsData: checked }))
                }
                disabled={!settings.trackInteractions}
              />
            </div>

            {/* Data Retention Period */}
            <div className="space-y-2">
              <Label htmlFor="retention-period" className="text-base font-medium">
                Data Retention Period
              </Label>
              <p className="text-sm text-muted-foreground">
                How long should we keep your interaction data?
              </p>
              <Select
                value={settings.retentionPeriodDays.toString()}
                onValueChange={(value) => 
                  setSettings(prev => ({ ...prev, retentionPeriodDays: parseInt(value) }))
                }
                disabled={!settings.trackInteractions}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="180">6 months</SelectItem>
                  <SelectItem value="365">1 year</SelectItem>
                  <SelectItem value="730">2 years</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>
            Export or delete your interaction data in compliance with privacy regulations.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Export Your Data</Label>
              <p className="text-sm text-muted-foreground">
                Download all your interaction data in JSON format.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(true)}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base font-medium">Delete Your Data</Label>
              <p className="text-sm text-muted-foreground">
                Permanently delete all your interaction data from our servers.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              Delete Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Export Confirmation Dialog */}
      {showExportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Export Interaction Data</CardTitle>
              <CardDescription>
                This will download all your interaction data as a JSON file.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowExportDialog(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleExportData}>
                Export Data
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Delete Interaction Data</CardTitle>
              <CardDescription>
                This will permanently delete all your interaction data. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteData}
              >
                Delete Data
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}