'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import { 
  Activity, 
  Users, 
  Eye, 
  Download, 
  Share2, 
  Bookmark, 
  TrendingUp,
  Calendar,
  Filter
} from 'lucide-react'
import { userInteractionTrackingService, type InteractionAnalytics } from '@/lib/services/user-interaction-tracking'

interface DateRange {
  start: string
  end: string
  label: string
}

const DATE_RANGES: DateRange[] = [
  {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
    label: 'Last 7 days'
  },
  {
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
    label: 'Last 30 days'
  },
  {
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
    label: 'Last 90 days'
  }
]

const INTERACTION_COLORS = {
  view: '#3b82f6',
  download: '#10b981',
  share: '#f59e0b',
  bookmark: '#8b5cf6',
  preview_click: '#06b6d4',
  search_click: '#ef4444'
}

export function InteractionAnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<InteractionAnalytics | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>(DATE_RANGES[1])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load analytics data
  useEffect(() => {
    async function loadAnalytics() {
      setIsLoading(true)
      setError(null)

      try {
        const data = await userInteractionTrackingService.getPlatformInteractionAnalytics({
          start: selectedDateRange.start,
          end: selectedDateRange.end
        })
        setAnalytics(data)
      } catch (err) {
        console.error('Error loading interaction analytics:', err)
        setError('Failed to load analytics data')
      } finally {
        setIsLoading(false)
      }
    }

    loadAnalytics()
  }, [selectedDateRange])

  const handleDateRangeChange = (value: string) => {
    const range = DATE_RANGES.find(r => r.label === value)
    if (range) {
      setSelectedDateRange(range)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Interaction Analytics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-red-600">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            className="mt-4"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    )
  }

  // Prepare chart data
  const interactionTypeData = Object.entries(analytics.interactionsByType).map(([type, count]) => ({
    type: type.replace('_', ' ').toUpperCase(),
    count,
    color: INTERACTION_COLORS[type as keyof typeof INTERACTION_COLORS] || '#6b7280'
  }))

  const engagementTrendData = analytics.userEngagementTrends.map(trend => ({
    date: new Date(trend.date).toLocaleDateString(),
    interactions: trend.interactions,
    users: trend.uniqueUsers
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Interaction Analytics</h2>
          <p className="text-muted-foreground">
            Track user engagement and interaction patterns across the platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <Select value={selectedDateRange.label} onValueChange={handleDateRangeChange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGES.map(range => (
                <SelectItem key={range.label} value={range.label}>
                  {range.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Interactions</p>
                <p className="text-2xl font-bold">{analytics.totalInteractions.toLocaleString()}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{analytics.uniqueUsers.toLocaleString()}</p>
              </div>
              <Users className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg. Engagement Time</p>
                <p className="text-2xl font-bold">
                  {Math.round(analytics.averageEngagementTime / 1000)}s
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Interactions per User</p>
                <p className="text-2xl font-bold">
                  {analytics.uniqueUsers > 0 
                    ? Math.round(analytics.totalInteractions / analytics.uniqueUsers)
                    : 0
                  }
                </p>
              </div>
              <Calendar className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Detailed Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="interactions">Interaction Types</TabsTrigger>
          <TabsTrigger value="trends">Engagement Trends</TabsTrigger>
          <TabsTrigger value="resources">Top Resources</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Interaction Types Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Interaction Distribution</CardTitle>
                <CardDescription>
                  Breakdown of different interaction types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={interactionTypeData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {interactionTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Daily Engagement Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Engagement</CardTitle>
                <CardDescription>
                  User interactions and active users over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={engagementTrendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="interactions" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      name="Interactions"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="users" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      name="Active Users"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="interactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interaction Types Breakdown</CardTitle>
              <CardDescription>
                Detailed view of all interaction types and their frequencies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={interactionTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Interaction Type Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(analytics.interactionsByType).map(([type, count]) => {
              const icon = {
                view: Eye,
                download: Download,
                share: Share2,
                bookmark: Bookmark,
                preview_click: Eye,
                search_click: Activity
              }[type] || Activity

              const IconComponent = icon

              return (
                <Card key={type}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium capitalize">
                          {type.replace('_', ' ')}
                        </span>
                      </div>
                      <Badge variant="secondary">
                        {count.toLocaleString()}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Trends</CardTitle>
              <CardDescription>
                Track how user engagement changes over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={500}>
                <LineChart data={engagementTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="interactions" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    name="Total Interactions"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="users" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name="Active Users"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resources" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Resources</CardTitle>
              <CardDescription>
                Resources with the highest user engagement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topResources.slice(0, 10).map((resource, index) => (
                  <div key={resource.resourceId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium">{resource.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {resource.uniqueUsers} unique users
                        </p>
                      </div>
                    </div>
                    <Badge>
                      {resource.interactions} interactions
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}