'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
  Search, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  MousePointer,
  Filter,
  AlertTriangle,
  BarChart3
} from 'lucide-react'
import { searchService } from '@/lib/services/search'
import type { SearchMetrics, QueryPerformance } from '@/lib/services/search-analytics'
import { cn } from '@/lib/utils'

interface SearchAnalyticsDashboardProps {
  userId?: string
  dateRange?: { start: string; end: string }
  className?: string
}

export function SearchAnalyticsDashboard({
  userId,
  dateRange,
  className
}: SearchAnalyticsDashboardProps) {
  const [metrics, setMetrics] = useState<SearchMetrics | null>(null)
  const [poorPerformers, setPoorPerformers] = useState<QueryPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    loadAnalytics()
  }, [userId, dateRange, selectedTimeRange])

  const loadAnalytics = async () => {
    setLoading(true)
    setError(null)

    try {
      // Calculate date range based on selection
      const endDate = new Date()
      const startDate = new Date()
      
      switch (selectedTimeRange) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7)
          break
        case '30d':
          startDate.setDate(endDate.getDate() - 30)
          break
        case '90d':
          startDate.setDate(endDate.getDate() - 90)
          break
      }

      const range = dateRange || {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }

      const [metricsData, poorPerformersData] = await Promise.all([
        searchService.getSearchMetrics(range, userId),
        searchService.getPoorPerformingQueries(10)
      ])

      setMetrics(metricsData)
      setPoorPerformers(poorPerformersData)
    } catch (err) {
      console.error('Error loading analytics:', err)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-muted animate-pulse rounded" />
                <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted animate-pulse rounded mb-2" />
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">{error || 'No analytics data available'}</p>
          <Button onClick={loadAnalytics} className="mt-4">
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Search Analytics</h2>
          <p className="text-muted-foreground">
            Insights into search behavior and performance
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={selectedTimeRange === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTimeRange('7d')}
          >
            7 days
          </Button>
          <Button
            variant={selectedTimeRange === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTimeRange('30d')}
          >
            30 days
          </Button>
          <Button
            variant={selectedTimeRange === '90d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedTimeRange('90d')}
          >
            90 days
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Searches</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalSearches.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.searchTrends.length > 1 && (
                <>
                  {metrics.searchTrends[metrics.searchTrends.length - 1].searches > 
                   metrics.searchTrends[metrics.searchTrends.length - 2].searches ? (
                    <TrendingUp className="inline h-3 w-3 text-green-500 mr-1" />
                  ) : (
                    <TrendingDown className="inline h-3 w-3 text-red-500 mr-1" />
                  )}
                  vs previous period
                </>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Results</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.averageResultsPerSearch.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              Results per search query
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Click-Through Rate</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics.clickThroughRate * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Users clicking on results
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Search Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.averageSearchTime.toFixed(0)}ms
            </div>
            <p className="text-xs text-muted-foreground">
              Time to return results
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Details */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Search Trends</TabsTrigger>
          <TabsTrigger value="queries">Top Queries</TabsTrigger>
          <TabsTrigger value="filters">Popular Filters</TabsTrigger>
          <TabsTrigger value="performance">Performance Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search Volume Over Time</CardTitle>
              <CardDescription>
                Daily search activity for the selected period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metrics.searchTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value) => [value, 'Searches']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="searches" 
                    stroke="#8884d8" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Popular Search Queries</CardTitle>
              <CardDescription>
                Top search terms and their performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.topQueries.slice(0, 10).map((query, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">{query.query}</div>
                      <div className="text-sm text-muted-foreground">
                        {query.count} searches • {query.avgResults.toFixed(1)} avg results
                      </div>
                    </div>
                    <Badge variant="secondary">
                      #{index + 1}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="filters" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Filter Usage</CardTitle>
              <CardDescription>
                Most commonly used search filters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(metrics.popularFilters).map(([key, value]) => ({
                      name: key,
                      value
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(metrics.popularFilters).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Poor Performing Queries</CardTitle>
              <CardDescription>
                Queries with low click-through rates or poor results
              </CardDescription>
            </CardHeader>
            <CardContent>
              {poorPerformers.length === 0 ? (
                <div className="text-center py-8">
                  <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-muted-foreground">
                    No performance issues detected! All queries are performing well.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {poorPerformers.map((query, index) => (
                    <div key={index} className="p-4 border rounded-lg bg-red-50 dark:bg-red-950/20">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-red-900 dark:text-red-100">
                            "{query.query}"
                          </div>
                          <div className="text-sm text-red-700 dark:text-red-300 mt-1">
                            {query.totalSearches} searches • {query.averageResults.toFixed(1)} avg results
                          </div>
                          <div className="flex gap-4 mt-2 text-xs text-red-600 dark:text-red-400">
                            <span>CTR: {(query.clickThroughRate * 100).toFixed(1)}%</span>
                            <span>Avg Time: {query.averageSearchTime.toFixed(0)}ms</span>
                          </div>
                        </div>
                        <Badge variant="destructive">
                          Needs Attention
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}