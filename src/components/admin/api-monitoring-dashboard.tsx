'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Activity,
  RefreshCw,
  Zap
} from 'lucide-react'

interface APIHealthStatus {
  service: 'youtube' | 'github'
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unavailable'
  lastChecked: string
  responseTime?: number
  errorRate: number
  quotaUsage?: number
  rateLimitStatus?: 'ok' | 'warning' | 'exceeded'
  circuitBreakerState: 'CLOSED' | 'OPEN' | 'HALF_OPEN'
}

interface APIAlert {
  id: string
  service: 'youtube' | 'github'
  type: 'quota_warning' | 'quota_exceeded' | 'rate_limit' | 'circuit_breaker' | 'high_error_rate'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  timestamp: string
  resolved: boolean
}

interface APIUsageMetrics {
  service: 'youtube' | 'github'
  timestamp: string
  requestCount: number
  successCount: number
  errorCount: number
  averageResponseTime: number
}

interface DashboardData {
  healthStatus: Record<string, APIHealthStatus>
  activeAlerts: APIAlert[]
  metrics: {
    youtube: APIUsageMetrics[]
    github: APIUsageMetrics[]
  }
  quotaInfo: {
    youtube?: {
      dailyLimit: number
      currentUsage: number
      resetTime: string
    }
    github?: {
      limit: number
      remaining: number
      reset: number
      used: number
    }
  }
}

export function APIMonitoringDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/monitoring?action=dashboard')
      if (!response.ok) {
        throw new Error('Failed to fetch monitoring data')
      }
      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const resolveAlert = async (alertId: string) => {
    try {
      const response = await fetch('/api/admin/monitoring?action=resolve-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId })
      })
      
      if (response.ok) {
        fetchData() // Refresh data
      }
    } catch (err) {
      console.error('Failed to resolve alert:', err)
    }
  }

  const testConnections = async () => {
    try {
      const response = await fetch('/api/admin/monitoring?action=test')
      const result = await response.json()
      console.log('Connection test results:', result)
      fetchData() // Refresh data after test
    } catch (err) {
      console.error('Failed to test connections:', err)
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'degraded':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'unavailable':
        return <XCircle className="h-4 w-4 text-gray-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800'
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800'
      case 'unhealthy':
        return 'bg-red-100 text-red-800'
      case 'unavailable':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-blue-100 text-blue-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'critical':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading monitoring data...</span>
      </div>
    )
  }

  if (error) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load monitoring data: {error}
          <Button onClick={fetchData} variant="outline" size="sm" className="ml-2">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!data) {
    return <div>No monitoring data available</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">API Monitoring Dashboard</h2>
        <div className="flex gap-2">
          <Button onClick={testConnections} variant="outline" size="sm">
            <Zap className="h-4 w-4 mr-2" />
            Test Connections
          </Button>
          <Button onClick={fetchData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Health Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(data.healthStatus).map(([service, health]) => (
          <Card key={service}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium capitalize">
                {service} API
              </CardTitle>
              {getStatusIcon(health.status)}
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Badge className={getStatusColor(health.status)}>
                  {health.status}
                </Badge>
                
                {health.responseTime && (
                  <div className="text-sm text-gray-600">
                    Response Time: {health.responseTime.toFixed(0)}ms
                  </div>
                )}
                
                <div className="text-sm text-gray-600">
                  Error Rate: {(health.errorRate * 100).toFixed(1)}%
                </div>
                
                {health.quotaUsage !== undefined && (
                  <div className="space-y-1">
                    <div className="text-sm text-gray-600">
                      Quota Usage: {(health.quotaUsage * 100).toFixed(1)}%
                    </div>
                    <Progress value={health.quotaUsage * 100} className="h-2" />
                  </div>
                )}
                
                <div className="text-xs text-gray-500">
                  Last checked: {new Date(health.lastChecked).toLocaleTimeString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active Alerts */}
      {data.activeAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
              Active Alerts ({data.activeAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.activeAlerts.map((alert) => (
                <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {alert.service}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {alert.type.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm">{alert.message}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => resolveAlert(alert.id)}
                    variant="outline"
                    size="sm"
                  >
                    Resolve
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metrics Tabs */}
      <Tabs defaultValue="youtube" className="w-full">
        <TabsList>
          <TabsTrigger value="youtube">YouTube Metrics</TabsTrigger>
          <TabsTrigger value="github">GitHub Metrics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="youtube">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                YouTube API Usage (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.quotaInfo.youtube && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Daily Limit:</span>
                      <div className="font-medium">{data.quotaInfo.youtube.dailyLimit}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Used:</span>
                      <div className="font-medium">{data.quotaInfo.youtube.currentUsage}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Resets:</span>
                      <div className="font-medium">
                        {new Date(data.quotaInfo.youtube.resetTime).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                {data.metrics.youtube.slice(-7).map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">
                      {new Date(metric.timestamp).toLocaleDateString()}
                    </span>
                    <div className="flex gap-4 text-sm">
                      <span>Requests: {metric.requestCount}</span>
                      <span className="text-green-600">Success: {metric.successCount}</span>
                      <span className="text-red-600">Errors: {metric.errorCount}</span>
                      <span>Avg Time: {metric.averageResponseTime.toFixed(0)}ms</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="github">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                GitHub API Usage (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.quotaInfo.github && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Limit:</span>
                      <div className="font-medium">{data.quotaInfo.github.limit}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Remaining:</span>
                      <div className="font-medium">{data.quotaInfo.github.remaining}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Used:</span>
                      <div className="font-medium">{data.quotaInfo.github.used}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Resets:</span>
                      <div className="font-medium">
                        {new Date(data.quotaInfo.github.reset * 1000).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                {data.metrics.github.slice(-7).map((metric, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">
                      {new Date(metric.timestamp).toLocaleDateString()}
                    </span>
                    <div className="flex gap-4 text-sm">
                      <span>Requests: {metric.requestCount}</span>
                      <span className="text-green-600">Success: {metric.successCount}</span>
                      <span className="text-red-600">Errors: {metric.errorCount}</span>
                      <span>Avg Time: {metric.averageResponseTime.toFixed(0)}ms</span>
                    </div>
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