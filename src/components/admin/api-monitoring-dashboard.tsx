'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Zap,
  Activity,
  Server
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { logger } from '@/lib/logger'
import { cn } from '@/lib/utils'

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
        fetchData()
      }
    } catch (err) {
      logger.error('Failed to resolve alert', { error: err })
    }
  }

  const testConnections = async () => {
    try {
      const response = await fetch('/api/admin/monitoring?action=test')
      const result = await response.json()
      logger.debug('Connection test results', { result })
      fetchData()
    } catch (err) {
      logger.error('Failed to test connections', { error: err })
    }
  }

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000)
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
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-200 dark:border-green-900'
      case 'degraded':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900'
      case 'unhealthy':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900'
      default:
        return 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-800'
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
      <div className="space-y-6">
        <BentoGrid>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </BentoGrid>
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>Failed to load monitoring data: {error}</span>
          <Button onClick={fetchData} variant="outline" size="sm">
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (!data) return <div>No monitoring data available</div>

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-heading">System Status</h2>
          <p className="text-muted-foreground">Real-time API monitoring and health checks</p>
        </div>
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

      <BentoGrid className="auto-rows-[minmax(180px,auto)]">
        {/* Active Alerts - Prominent if any */}
        {data.activeAlerts.length > 0 && (
          <BentoGridItem
            title="Active Alerts"
            description={`${data.activeAlerts.length} system alerts require attention`}
            header={
              <div className="mt-4 space-y-3 max-h-[200px] overflow-auto pr-2">
                {data.activeAlerts.map((alert) => (
                  <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg bg-red-50 dark:bg-red-900/10 dark:border-red-900/30">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="destructive" className="uppercase text-[10px]">
                          {alert.severity}
                        </Badge>
                        <span className="font-semibold text-sm capitalize">{alert.service}</span>
                      </div>
                      <p className="text-sm font-medium">{alert.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    <Button
                      onClick={() => resolveAlert(alert.id)}
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Resolve
                    </Button>
                  </div>
                ))}
              </div>
            }
            className="md:col-span-3 border-red-200 dark:border-red-900"
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          />
        )}

        {/* YouTube Status */}
        <BentoGridItem
          title="YouTube API"
          description={
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className={cn("capitalize", getStatusColor(data.healthStatus.youtube?.status || 'unknown'))}>
                {data.healthStatus.youtube?.status}
              </Badge>
              {data.healthStatus.youtube?.quotaUsage !== undefined && (
                <span className="text-xs text-muted-foreground flex items-center">
                  Quota: {(data.healthStatus.youtube.quotaUsage * 100).toFixed(1)}%
                </span>
              )}
            </div>
          }
          header={
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/50 p-2 rounded">
                  <div className="text-muted-foreground text-xs">Latency</div>
                  <div className="font-mono font-bold">{data.healthStatus.youtube?.responseTime?.toFixed(0)}ms</div>
                </div>
                <div className="bg-muted/50 p-2 rounded">
                  <div className="text-muted-foreground text-xs">Errors</div>
                  <div className="font-mono font-bold">{(data.healthStatus.youtube?.errorRate * 100).toFixed(1)}%</div>
                </div>
              </div>
              {data.quotaInfo.youtube && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Daily Quota</span>
                    <span>{data.quotaInfo.youtube.currentUsage.toLocaleString()} / {data.quotaInfo.youtube.dailyLimit.toLocaleString()}</span>
                  </div>
                  <Progress value={(data.quotaInfo.youtube.currentUsage / data.quotaInfo.youtube.dailyLimit) * 100} className="h-2" />
                </div>
              )}
            </div>
          }
          className="md:col-span-1"
          icon={<Server className="h-4 w-4 text-red-500" />}
        />

        {/* GitHub Status */}
        <BentoGridItem
          title="GitHub API"
          description={
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className={cn("capitalize", getStatusColor(data.healthStatus.github?.status || 'unknown'))}>
                {data.healthStatus.github?.status}
              </Badge>
              <span className="text-xs text-muted-foreground flex items-center">
                Remaining: {data.quotaInfo.github?.remaining}
              </span>
            </div>
          }
          header={
            <div className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-muted/50 p-2 rounded">
                  <div className="text-muted-foreground text-xs">Latency</div>
                  <div className="font-mono font-bold">{data.healthStatus.github?.responseTime?.toFixed(0)}ms</div>
                </div>
                <div className="bg-muted/50 p-2 rounded">
                  <div className="text-muted-foreground text-xs">Errors</div>
                  <div className="font-mono font-bold">{(data.healthStatus.github?.errorRate * 100).toFixed(1)}%</div>
                </div>
              </div>
              {data.quotaInfo.github && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Hourly Limit</span>
                    <span>{data.quotaInfo.github.used} / {data.quotaInfo.github.limit}</span>
                  </div>
                  <Progress value={(data.quotaInfo.github.used / data.quotaInfo.github.limit) * 100} className="h-2" />
                </div>
              )}
            </div>
          }
          className="md:col-span-1"
          icon={<Server className="h-4 w-4 text-neutral-800 dark:text-white" />}
        />

        {/* System Health Overview (Charts) */}
        <BentoGridItem
          title="API Traffic Overview"
          description="Request volume per service"
          header={
            <div className="h-[200px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.metrics.youtube.map((m, i) => ({
                  time: new Date(m.timestamp).toLocaleDateString(),
                  youtube: m.requestCount,
                  github: data.metrics.github[i]?.requestCount || 0
                }))}>
                  <defs>
                    <linearGradient id="colorYoutube" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorGithub" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="youtube" stroke="#ef4444" fillOpacity={1} fill="url(#colorYoutube)" strokeWidth={2} />
                  <Area type="monotone" dataKey="github" stroke="#6366f1" fillOpacity={1} fill="url(#colorGithub)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          }
          className="md:col-span-2"
          icon={<Activity className="h-4 w-4 text-neutral-500" />}
        />
      </BentoGrid>
    </div>
  )
}