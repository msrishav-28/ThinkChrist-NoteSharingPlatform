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
  Calendar,
  TrendingUp,
  BookOpen,
  Target,
  Bell,
  RefreshCw,
  Layout,
  Zap,
  Clock,
  BarChart3,
  Sparkles
} from 'lucide-react'
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'
import { motion, AnimatePresence } from 'framer-motion'
import { config } from '@/shared/config'
import { cn } from '@/lib/utils'

interface DashboardWidget {
  id: string
  title: string
  component: React.ComponentType<any>
  icon: React.ComponentType<any>
  description: string
  defaultVisible: boolean
  customizable: boolean
  className?: string
}

const availableWidgets: DashboardWidget[] = [
  {
    id: 'quick-insights',
    title: 'Quick Insights',
    component: QuickInsights,
    icon: BarChart3,
    description: 'Learning progress and achievement tracking',
    defaultVisible: true,
    customizable: true,
    className: 'md:col-span-1'
  },
  {
    id: 'personalized-feed',
    title: 'Personalized Feed',
    component: PersonalizedFeed,
    icon: Zap,
    description: 'Content curated based on your interests and activity',
    defaultVisible: true,
    customizable: true,
    className: 'md:col-span-2'
  },
  {
    id: 'recommendations',
    title: 'AI Recommendations',
    component: Recommendations,
    icon: Target,
    description: 'AI-powered content recommendations based on your interests',
    defaultVisible: true,
    customizable: true,
    className: 'md:col-span-1'
  },
  {
    id: 'activity',
    title: 'Recent Activity',
    component: ActivityFeed,
    icon: Calendar,
    description: 'Your recent uploads, votes, and achievements',
    defaultVisible: true,
    customizable: true,
    className: 'md:col-span-1'
  },
  {
    id: 'recent-uploads',
    title: 'Community Updates',
    component: RecentUploads,
    icon: BookOpen,
    description: 'Latest resources uploaded by the community',
    defaultVisible: true,
    customizable: true,
    className: 'md:col-span-2'
  },
  {
    id: 'notifications',
    title: 'Notifications',
    component: NotificationCenter,
    icon: Bell,
    description: 'Your latest notifications and updates',
    defaultVisible: false,
    customizable: true,
    className: 'md:col-span-3'
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

    const savedWidgets = preferences?.dashboard_settings?.visible_widgets
    if (savedWidgets && Array.isArray(savedWidgets)) {
      setVisibleWidgets(savedWidgets)
    } else {
      setVisibleWidgets(defaultWidgets)
    }

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
      return newWidgets
    })
  }

  const saveDashboardSettings = async (settings: any) => {
    // Placeholder for saving settings
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
    <div className="space-y-8 p-1">
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/95 to-primary/80 dark:from-primary/20 dark:to-primary/10 p-8 sm:p-12 text-white shadow-2xl"
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 mix-blend-overlay" />
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-md">
                Semester {profile?.semester || 1}
              </Badge>
              <Badge variant="outline" className="border-white/30 text-white">
                {profile?.department || 'General'}
              </Badge>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold font-heading tracking-tight">
              {getGreeting()}, <span className="text-white/90">{profile?.full_name?.split(' ')[0] || 'Scholar'}</span>.
            </h1>
            <p className="text-lg text-blue-100 max-w-xl">
              Ready to continue your journey? You have <span className="font-bold text-white">{unreadCount}</span> new notifications and pending tasks.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={refreshDashboard}
              disabled={dashboardLoading}
              className="backdrop-blur-md bg-white/10 hover:bg-white/20 text-white border-0"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", dashboardLoading && "animate-spin")} />
              Refresh
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" className="backdrop-blur-md bg-white/10 hover:bg-white/20 text-white border-0">
                  <Settings className="h-4 w-4 mr-2" />
                  Customize
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-xl glass p-2">
                <DropdownMenuItem onClick={() => setCustomizationMode(!customizationMode)}>
                  <Layout className="h-4 w-4 mr-2" />
                  {customizationMode ? 'Exit Customization' : 'Customize Layout'}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 flex items-center justify-between">
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
      </motion.div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-8">
        <TabsList className="bg-transparent p-0 gap-4">
          <TabsTrigger value="overview" className="rounded-full px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg bg-secondary/50 backdrop-blur-sm transition-all">Overview</TabsTrigger>
          <TabsTrigger value="activity" className="rounded-full px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg bg-secondary/50 backdrop-blur-sm transition-all">Activity</TabsTrigger>
          <TabsTrigger value="recommendations" className="rounded-full px-6 py-2 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg bg-secondary/50 backdrop-blur-sm transition-all">For You</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-8 focus-visible:outline-none">
          {/* Stats Row - Animated */}
          <StatsCard />

          {/* Bento Grid Layout for Widgets */}
          <BentoGrid className="auto-rows-min">
            {visibleWidgetComponents.map((widget, i) => {
              const Component = widget.component
              return (
                <BentoGridItem
                  key={widget.id}
                  title={customizationMode ? (
                    <div className="flex justify-between items-center w-full">
                      <span>{widget.title}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleWidget(widget.id)}
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                      >
                        <EyeOff className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                  className={cn(
                    widget.className,
                    "min-h-[300px] bg-transparent border-0 shadow-none p-0", // Transparent wrapper because widgets are cards
                    customizationMode && "border-2 border-dashed border-primary/50 bg-primary/5 rounded-xl p-4"
                  )}
                >
                  {/* Render the component directly. Since they are Cards, they will look correct. */}
                  <div className="h-full w-full">
                    <Component compact={compactMode} />
                  </div>
                </BentoGridItem>
              )
            })}
          </BentoGrid>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <ActivityFeed />
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <RecentUploads />
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-6">
          {shouldShowRecommendations() ? (
            <BentoGrid>
              <BentoGridItem className="md:col-span-2 bg-transparent border-0 shadow-none p-0">
                <PersonalizedFeed />
              </BentoGridItem>
              <BentoGridItem className="md:col-span-1 bg-transparent border-0 shadow-none p-0">
                <Recommendations />
              </BentoGridItem>
            </BentoGrid>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card className="glass text-center p-12">
                <Target className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2">Recommendations Disabled</h3>
                <p className="text-muted-foreground mb-6">
                  Enable personalized recommendations in your settings to see content tailored to your interests.
                </p>
                <Button asChild>
                  <a href="/settings">
                    <Settings className="h-4 w-4 mr-2" />
                    Go to Settings
                  </a>
                </Button>
              </Card>
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}