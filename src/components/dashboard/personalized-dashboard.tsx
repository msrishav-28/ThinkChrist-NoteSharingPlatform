'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/features/auth'
import { usePreferences } from '@/features/user-management/hooks'
import { useNotifications } from '@/hooks/use-notifications'
import { useDashboard } from '@/hooks/use-dashboard'
import { StatsCard } from './stats-card'
import { Recommendations } from './recommendations'
import { ActivityFeed } from './activity-feed'
import { RecentUploads } from './recent-uploads'
import { PersonalizedFeed } from './personalized-feed'
import { QuickInsights } from './quick-insights'
import { NotificationCenter } from '../notifications/notification-center'
import {
  Settings,
  Eye,
  EyeOff,
  MoreVertical,
  Calendar,
  TrendingUp,
  BookOpen,
  Users,
  Target,
  Bell,
  RefreshCw,
  Layout,
  Zap,
  Clock,
  BarChart3
} from 'lucide-react'

interface DashboardWidget {
  id: string
  title: string
  component: React.ComponentType<any>
  icon: React.ComponentType<any>
  description: string
  defaultVisible: boolean
  customizable: boolean
}

const availableWidgets: DashboardWidget[] = [
  {
    id: 'stats',
    title: 'Statistics Overview',
    component: StatsCard,
    icon: TrendingUp,
    description: 'Your upload, download, and engagement statistics',
    defaultVisible: true,
    customizable: false
  },
  {
    id: 'quick-insights',
    title: 'Quick Insights',
    component: QuickInsights,
    icon: BarChart3,
    description: 'Learning progress and achievement tracking',
    defaultVisible: true,
    customizable: true
  },
  {
    id: 'personalized-feed',
    title: 'Personalized Feed',
    component: PersonalizedFeed,
    icon: Zap,
    description: 'Content curated based on your interests and activity',
    defaultVisible: true,
    customizable: true
  },
  {
    id: 'recommendations',
    title: 'AI Recommendations',
    component: Recommendations,
    icon: Target,
    description: 'AI-powered content recommendations based on your interests',
    defaultVisible: true,
    customizable: true
  },
  {
    id: 'activity',
    title: 'Recent Activity',
    component: ActivityFeed,
    icon: Calendar,
    description: 'Your recent uploads, votes, and achievements',
    defaultVisible: true,
    customizable: true
  },
  {
    id: 'recent-uploads',
    title: 'Community Updates',
    component: RecentUploads,
    icon: BookOpen,
    description: 'Latest resources uploaded by the community',
    defaultVisible: true,
    customizable: true
  },
  {
    id: 'notifications',
    title: 'Notifications',
    component: NotificationCenter,
    icon: Bell,
    description: 'Your latest notifications and updates',
    defaultVisible: false,
    customizable: true
  }
]

export function PersonalizedDashboard() {
  const { user, profile } = useAuth()
  const { preferences } = usePreferences()
  const { unreadCount } = useNotifications({ limit: 1 })
  const { data: dashboardData, loading: dashboardLoading, refresh: refreshDashboard, lastUpdated } = useDashboard({
    autoRefresh: true,
    refreshInterval: 5 * 60 * 1000 // 5 minutes
  })
  const [visibleWidgets, setVisibleWidgets] = useState<string[]>([])
  const [customizationMode, setCustomizationMode] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [compactMode, setCompactMode] = useState(false)

  // Initialize visible widgets based on preferences or defaults
  useEffect(() => {
    const defaultWidgets = availableWidgets
      .filter(widget => widget.defaultVisible)
      .map(widget => widget.id)

    // Load from user preferences if available
    const savedWidgets = preferences?.dashboard_settings?.visible_widgets
    if (savedWidgets && Array.isArray(savedWidgets)) {
      setVisibleWidgets(savedWidgets)
    } else {
      setVisibleWidgets(defaultWidgets)
    }

    // Load other dashboard preferences
    if (preferences?.dashboard_settings) {
      setAutoRefresh(preferences.dashboard_settings.auto_refresh !== false)
      setCompactMode(preferences.dashboard_settings.compact_mode === true)
    }
  }, [preferences])

  const toggleWidget = (widgetId: string) => {
    setVisibleWidgets(prev => {
      const newWidgets = prev.includes(widgetId)
        ? prev.filter(id => id !== widgetId)
        : [...prev, widgetId]

      // TODO: Save to user preferences
      // saveDashboardPreferences({ visible_widgets: newWidgets })

      return newWidgets
    })
  }

  const saveDashboardSettings = async (settings: any) => {
    // TODO: Implement saving dashboard settings to user preferences
    // Settings would be saved via API call here
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const shouldShowRecommendations = () => {
    return preferences?.recommendation_settings?.enable_recommendations !== false
  }

  const visibleWidgetComponents = availableWidgets.filter(widget =>
    visibleWidgets.includes(widget.id) &&
    (widget.id !== 'recommendations' || shouldShowRecommendations())
  )

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                {getGreeting()}, {profile?.full_name || user?.email}!
              </CardTitle>
              <CardDescription className="flex items-center gap-4 mt-2">
                <span>{profile?.department} • Semester {profile?.semester}</span>
                <Badge variant="secondary">
                  {dashboardData?.stats?.badge_level || profile?.badge_level || 'Newcomer'}
                </Badge>
                {(dashboardData?.unread_notifications || unreadCount) > 0 && (
                  <Badge variant="destructive">
                    {dashboardData?.unread_notifications || unreadCount} new notification{(dashboardData?.unread_notifications || unreadCount) > 1 ? 's' : ''}
                  </Badge>
                )}
                {lastUpdated && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Updated {new Date(lastUpdated).toLocaleTimeString()}
                  </span>
                )}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshDashboard}
                disabled={dashboardLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${dashboardLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Customize
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuItem onClick={() => setCustomizationMode(!customizationMode)}>
                    <Layout className="h-4 w-4 mr-2" />
                    {customizationMode ? 'Exit Customization' : 'Customize Layout'}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <div className="px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="auto-refresh" className="text-sm">Auto Refresh</Label>
                      <Switch
                        id="auto-refresh"
                        checked={autoRefresh}
                        onCheckedChange={(checked) => {
                          setAutoRefresh(checked)
                          saveDashboardSettings({ auto_refresh: checked })
                        }}
                      />
                    </div>
                  </div>

                  <div className="px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="compact-mode" className="text-sm">Compact Mode</Label>
                      <Switch
                        id="compact-mode"
                        checked={compactMode}
                        onCheckedChange={(checked) => {
                          setCompactMode(checked)
                          saveDashboardSettings({ compact_mode: checked })
                        }}
                      />
                    </div>
                  </div>

                  <DropdownMenuSeparator />

                  {availableWidgets.filter(w => w.customizable).map(widget => (
                    <DropdownMenuItem
                      key={widget.id}
                      onClick={() => toggleWidget(widget.id)}
                    >
                      {visibleWidgets.includes(widget.id) ? (
                        <EyeOff className="h-4 w-4 mr-2" />
                      ) : (
                        <Eye className="h-4 w-4 mr-2" />
                      )}
                      {visibleWidgets.includes(widget.id) ? 'Hide' : 'Show'} {widget.title}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Customization Mode Banner */}
      {customizationMode && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Dashboard Customization Mode</p>
                  <p className="text-sm text-blue-700">
                    Use the dropdown menu to show or hide dashboard widgets
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCustomizationMode(false)}
              >
                Done
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Content */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="recommendations">For You</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Statistics - Always visible */}
          <StatsCard />

          {/* Dynamic Widgets Grid */}
          <div className={`grid gap-6 ${compactMode ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {visibleWidgetComponents
              .filter(widget => ['personalized-feed', 'activity', 'recent-uploads', 'quick-insights'].includes(widget.id))
              .map(widget => {
                const Component = widget.component
                return (
                  <div key={widget.id} className="relative">
                    {customizationMode && (
                      <div className="absolute top-2 right-2 z-10">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => toggleWidget(widget.id)}
                        >
                          <EyeOff className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <Component compact={compactMode} />
                  </div>
                )
              })}
          </div>

          {/* Recommendations - Full width or sidebar */}
          {visibleWidgetComponents
            .filter(widget => widget.id === 'recommendations')
            .map(widget => {
              const Component = widget.component
              return (
                <div key={widget.id} className="relative">
                  {customizationMode && (
                    <div className="absolute top-2 right-2 z-10">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleWidget(widget.id)}
                      >
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <Component />
                </div>
              )
            })}

          {/* Full-width widgets */}
          {visibleWidgetComponents
            .filter(widget => ['notifications'].includes(widget.id))
            .map(widget => {
              const Component = widget.component
              return (
                <div key={widget.id} className="relative">
                  {customizationMode && (
                    <div className="absolute top-2 right-2 z-10">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleWidget(widget.id)}
                      >
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <Component />
                </div>
              )
            })}
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <ActivityFeed />
            <RecentUploads />
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          {shouldShowRecommendations() ? (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <PersonalizedFeed />
              </div>
              <div className="lg:col-span-1">
                <Recommendations />
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Recommendations Disabled</h3>
                <p className="text-muted-foreground mb-4">
                  Enable personalized recommendations in your settings to see content tailored to your interests.
                </p>
                <Button variant="outline" asChild>
                  <a href="/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Go to Settings
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}