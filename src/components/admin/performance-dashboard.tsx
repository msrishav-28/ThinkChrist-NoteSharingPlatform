'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { performanceMonitor } from '@/lib/services/performance-monitor'
import { searchCache } from '@/lib/services/cache/search-cache'
import { linkPreviewCache } from '@/lib/services/cache/link-preview-cache'
import { AlertTriangle, TrendingUp, Database, Search, Link, Clock } from 'lucide-react'

interface PerformanceStats {
  average: number
  median: number
  p95: number
  p99: number
  min: number
  max: number
  count: number
}

interface PerformanceAlert {
  type: string
  message: string
  severity: 'low' | 'medium' | 'high'
  metric_name: string
  current_value: number
  threshold: number
}

interface SlowQuery {
  query_type: string
  table_name: string
  avg_execution_time: number
  max_execution_time: number
  count: number
}

export function PerformanceDashboard() {
  const [apiStats, setApiStats] = useState<PerformanceStats | null>(null)
  const [searchStats, setSearchStats] = useState<PerformanceStats | null>(null)
  const [dbStats, setDbStats] = useState<PerformanceStats | null>(null)
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([])
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([])
  const [cacheMetrics, setCacheMetrics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h')

  useEffect(() => {
    loadPerformanceData()
    const interval = setInterval(loadPerformanceData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [timeRange])

  const loadPerformanceData = async () => {
    try {
      setLoading(true)
      
      const [
        apiStatsData,
        searchStatsData,
        dbStatsData,
        alertsData,
        slowQueriesData,
        searchCacheMetrics,
        linkCacheMetrics
      ] = await Promise.all([
        performanceMonitor.getPerformanceStats('api_endpoint', timeRange),
        performanceMonitor.getPerformanceStats('search_performance', timeRange),
        performanceMonitor.getPerformanceStats('database_query', timeRange),
        performanceMonitor.getPerformanceAlerts(),
        performanceMonitor.getSlowQueries(1000, 10),
        searchCache.getPerformanceMetrics(),
        linkPreviewCache.getPerformanceMetrics()
      ])

      setApiStats(apiStatsData)
      setSearchStats(searchStatsData)
      setDbStats(dbStatsData)
      setAlerts(alertsData)
      setSlowQueries(slowQueriesData)
      setCacheMetrics({
        search: searchCacheMetrics,
        linkPreview: linkCacheMetrics
      })
    } catch (error) {
      console.error('Error loading performance data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive'
      case 'medium': return 'default'
      case 'low': return 'secondary'
      default: return 'default'
    }
  }

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'text-green-600'
    if (value <= thresholds.warning) return 'text-yellow-600'
    return 'text-red-600'
  }

  if (loading && !apiStats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading performance data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Performance Dashboard</h1>
          <p className="text-gray-600">Monitor system performance and identify bottlenecks</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as any)}
            className="px-3 py-2 border rounded-md"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <Button onClick={loadPerformanceData} disabled={loading}>
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2" />
            Performance Alerts
          </h2>
          {alerts.map((alert, index) => (
            <Alert key={index} variant={alert.severity === 'high' ? 'destructive' : 'default'}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle className="flex items-center justify-between">
                {alert.message}
                <Badge variant={getSeverityColor(alert.severity)}>
                  {alert.severity.toUpperCase()}
                </Badge>
              </AlertTitle>
              <AlertDescription>
                Current: {formatDuration(alert.current_value)} | Threshold: {formatDuration(alert.threshold)}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="api">API Performance</TabsTrigger>
          <TabsTrigger value="database">Database</TabsTrigger>
          <TabsTrigger value="cache">Cache Performance</TabsTrigger>
          <TabsTrigger value="search">Search & Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* API Performance Overview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Response Time</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getPerformanceColor(apiStats?.p95 || 0, { good: 500, warning: 1000 })}>
                    {formatDuration(apiStats?.p95 || 0)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  P95 response time ({apiStats?.count || 0} requests)
                </p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Avg: {formatDuration(apiStats?.average || 0)}</span>
                    <span>Max: {formatDuration(apiStats?.max || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Database Performance Overview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Database Queries</CardTitle>
                <Database className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getPerformanceColor(dbStats?.p95 || 0, { good: 100, warning: 500 })}>
                    {formatDuration(dbStats?.p95 || 0)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  P95 query time ({dbStats?.count || 0} queries)
                </p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Avg: {formatDuration(dbStats?.average || 0)}</span>
                    <span>Max: {formatDuration(dbStats?.max || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Search Performance Overview */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Search Performance</CardTitle>
                <Search className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getPerformanceColor(searchStats?.p95 || 0, { good: 200, warning: 1000 })}>
                    {formatDuration(searchStats?.p95 || 0)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  P95 search time ({searchStats?.count || 0} searches)
                </p>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span>Avg: {formatDuration(searchStats?.average || 0)}</span>
                    <span>Max: {formatDuration(searchStats?.max || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Performance Metrics</CardTitle>
              <CardDescription>Detailed API endpoint performance statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {apiStats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{formatDuration(apiStats.average)}</div>
                    <div className="text-sm text-gray-600">Average</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{formatDuration(apiStats.median)}</div>
                    <div className="text-sm text-gray-600">Median</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{formatDuration(apiStats.p95)}</div>
                    <div className="text-sm text-gray-600">95th Percentile</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{formatDuration(apiStats.p99)}</div>
                    <div className="text-sm text-gray-600">99th Percentile</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Database Performance</CardTitle>
                <CardDescription>Query execution time statistics</CardDescription>
              </CardHeader>
              <CardContent>
                {dbStats && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-xl font-bold">{formatDuration(dbStats.average)}</div>
                        <div className="text-sm text-gray-600">Average</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold">{formatDuration(dbStats.p95)}</div>
                        <div className="text-sm text-gray-600">95th Percentile</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-600">Total Queries: {dbStats.count}</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Slow Queries</CardTitle>
                <CardDescription>Queries taking longer than 1 second</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {slowQueries.length > 0 ? (
                    slowQueries.slice(0, 5).map((query, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div>
                          <div className="font-medium">{query.query_type}</div>
                          <div className="text-sm text-gray-600">{query.table_name}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatDuration(query.avg_execution_time)}</div>
                          <div className="text-sm text-gray-600">{query.count} times</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-600">No slow queries detected</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Search className="w-5 h-5 mr-2" />
                  Search Cache
                </CardTitle>
                <CardDescription>Search results caching performance</CardDescription>
              </CardHeader>
              <CardContent>
                {cacheMetrics?.search && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Hit Rate</span>
                      <span className="font-bold">
                        {(cacheMetrics.search.hitRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={cacheMetrics.search.hitRate * 100} className="w-full" />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Cache Size</div>
                        <div className="text-gray-600">{cacheMetrics.search.cacheSize} entries</div>
                      </div>
                      <div>
                        <div className="font-medium">Memory Size</div>
                        <div className="text-gray-600">{cacheMetrics.search.memorySize} entries</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Link className="w-5 h-5 mr-2" />
                  Link Preview Cache
                </CardTitle>
                <CardDescription>Link preview caching performance</CardDescription>
              </CardHeader>
              <CardContent>
                {cacheMetrics?.linkPreview && (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Hit Rate</span>
                      <span className="font-bold">
                        {(cacheMetrics.linkPreview.hitRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={cacheMetrics.linkPreview.hitRate * 100} className="w-full" />
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="font-medium">Cache Size</div>
                        <div className="text-gray-600">{cacheMetrics.linkPreview.cacheSize} entries</div>
                      </div>
                      <div>
                        <div className="font-medium">Memory Size</div>
                        <div className="text-gray-600">{cacheMetrics.linkPreview.memorySize} entries</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Search & Recommendation Performance</CardTitle>
              <CardDescription>Performance metrics for search and recommendation systems</CardDescription>
            </CardHeader>
            <CardContent>
              {searchStats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{formatDuration(searchStats.average)}</div>
                    <div className="text-sm text-gray-600">Average Search Time</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{formatDuration(searchStats.p95)}</div>
                    <div className="text-sm text-gray-600">95th Percentile</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{searchStats.count}</div>
                    <div className="text-sm text-gray-600">Total Searches</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}