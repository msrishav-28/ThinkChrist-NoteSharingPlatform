'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'
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
  BarChart3,
  Calendar
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
        <BentoGrid>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />
          ))}
        </BentoGrid>
      </div>
    )
  }

  if (error || !metrics) {
    return (
      <Card className={cn("p-6 border-destructive/50 bg-destructive/10", className)}>
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-destructive font-medium">{error || 'No analytics data available'}</p>
          <Button onClick={loadAnalytics} className="mt-4" variant="outline">
            Try Again
          </Button>
        </div>
      </Card>
    )
  }

  const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981']

  const MetricItem = ({
    title,
    value,
    subtitle,
    icon: Icon,
    trend
  }: {
    title: string
    value: string
    subtitle: string
    icon: any
    trend?: 'up' | 'down'
  }) => (
    <div className="flex flex-col justify-between h-full p-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="p-2 bg-primary/10 rounded-full">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold font-heading">{value}</div>
        <div className="flex items-center gap-1 mt-1">
          {trend && (
            trend === 'up'
              ? <TrendingUp className="h-3 w-3 text-green-500" />
              : <TrendingDown className="h-3 w-3 text-red-500" />
          )}
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </div>
  )

  const searchTrend = metrics.searchTrends.length > 1
    ? metrics.searchTrends[metrics.searchTrends.length - 1].searches >
      metrics.searchTrends[metrics.searchTrends.length - 2].searches
      ? 'up' : 'down'
    : undefined

  return (
    <div className={cn("space-y-8", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold font-heading">Search Analytics</h2>
          <p className="text-muted-foreground">
            Monitor search performance and user behavior
          </p>
        </div>

        <div className="flex items-center p-1 bg-muted/50 rounded-lg border border-border/50">
          <Button
            variant={selectedTimeRange === '7d' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTimeRange('7d')}
            className="text-xs"
          >
            7 Days
          </Button>
          <Button
            variant={selectedTimeRange === '30d' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTimeRange('30d')}
            className="text-xs"
          >
            30 Days
          </Button>
          <Button
            variant={selectedTimeRange === '90d' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setSelectedTimeRange('90d')}
            className="text-xs"
          >
            90 Days
          </Button>
        </div>
      </div>

      <BentoGrid className="auto-rows-[minmax(180px,auto)]">
        {/* Total Searches */}
        <BentoGridItem
          title="Total Searches"
          description={
            <div className="mt-2">
              <div className="text-4xl font-bold font-heading text-indigo-500">{metrics.totalSearches.toLocaleString()}</div>
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                {searchTrend === 'up' ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
                vs previous period
              </div>
            </div>
          }
          header={<div className="h-full w-full bg-indigo-500/10 rounded-xl" />}
          className="md:col-span-1"
          icon={<Search className="h-4 w-4 text-indigo-500" />}
        />

        {/* Chart: Search Trends */}
        <BentoGridItem
          title="Search Volume Trend"
          description="Daily search activity"
          header={
            <div className="h-full w-full min-h-[200px] flex items-center justify-center p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={metrics.searchTrends}>
                  <defs>
                    <linearGradient id="colorSearches" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', color: '#fff' }}
                    cursor={{ stroke: '#8884d8', strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="searches"
                    stroke="#8884d8"
                    strokeWidth={3}
                    dot={false}
                    fillOpacity={1}
                    fill="url(#colorSearches)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          }
          className="md:col-span-2 row-span-2"
          icon={<TrendingUp className="h-4 w-4 text-neutral-500" />}
        />

        {/* Avg Results */}
        <BentoGridItem
          title="Avg Results"
          description="Per search query"
          header={
            <div className="flex items-center justify-center h-full">
              <div className="text-4xl font-bold text-emerald-500">{metrics.averageResultsPerSearch.toFixed(1)}</div>
            </div>
          }
          className="md:col-span-1"
          icon={<BarChart3 className="h-4 w-4 text-neutral-500" />}
        />

        {/* Avg Time */}
        <BentoGridItem
          title="Avg Search Time"
          description="Latency in ms"
          header={
            <div className="flex items-center justify-center h-full">
              <div className="text-4xl font-bold text-amber-500">{metrics.averageSearchTime.toFixed(0)}<span className="text-lg text-muted-foreground ml-1">ms</span></div>
            </div>
          }
          className="md:col-span-1"
          icon={<Clock className="h-4 w-4 text-neutral-500" />}
        />

        {/* CTR */}
        <BentoGridItem
          title="Click-Through Rate"
          description="Engagement"
          header={
            <div className="flex items-center justify-center h-full">
              <div className="text-4xl font-bold text-pink-500">{(metrics.clickThroughRate * 100).toFixed(1)}%</div>
            </div>
          }
          className="md:col-span-1"
          icon={<MousePointer className="h-4 w-4 text-neutral-500" />}
        />

        {/* Top Queries Table */}
        <BentoGridItem
          title="Top Search Queries"
          description="Most frequent terms"
          header={
            <div className="mt-4 space-y-3">
              {metrics.topQueries.slice(0, 5).map((query, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5">
                  <span className="font-medium text-sm truncate max-w-[120px]">{query.query}</span>
                  <Badge variant="secondary" className="text-xs">{query.count}</Badge>
                </div>
              ))}
            </div>
          }
          className="md:col-span-1 row-span-2"
          icon={<Search className="h-4 w-4 text-neutral-500" />}
        />

        {/* Filter Usage */}
        <BentoGridItem
          title="Filter Usage"
          description="Distribution of applied filters"
          header={
            <div className="h-full w-full min-h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(metrics.popularFilters).map(([key, value]) => ({
                      name: key,
                      value
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {Object.entries(metrics.popularFilters).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-2 mt-2">
                {Object.entries(metrics.popularFilters).slice(0, 3).map(([key], index) => (
                  <div key={key} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    {key}
                  </div>
                ))}
              </div>
            </div>
          }
          className="md:col-span-2"
          icon={<Filter className="h-4 w-4 text-neutral-500" />}
        />

        {/* Performance Issues */}
        {poorPerformers.length > 0 && (
          <BentoGridItem
            title="Needs Attention"
            description="Low performing queries"
            header={
              <div className="h-full overflow-auto max-h-[200px] space-y-2 pr-2">
                {poorPerformers.slice(0, 4).map((query, index) => (
                  <div key={index} className="flex items-center justify-between p-2 rounded-lg border border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-900/30">
                    <div className="max-w-[70%]">
                      <div className="font-medium text-sm truncate text-red-700 dark:text-red-300">"{query.query}"</div>
                      <div className="text-xs text-red-600/80 dark:text-red-400/80">CTR: {(query.clickThroughRate * 100).toFixed(0)}%</div>
                    </div>
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                  </div>
                ))}
              </div>
            }
            className="md:col-span-1"
            icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          />
        )}
      </BentoGrid>
    </div>
  )
}