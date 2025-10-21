import { NextRequest, NextResponse } from 'next/server'
import { APIMonitoringService } from '@/lib/services/api-monitoring'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const service = searchParams.get('service') as 'youtube' | 'github' | null
    const action = searchParams.get('action')

    // Handle different monitoring actions
    switch (action) {
      case 'health':
        if (service) {
          const health = APIMonitoringService.getServiceHealth(service)
          return NextResponse.json({ health })
        } else {
          const allHealth = APIMonitoringService.getHealthStatus()
          return NextResponse.json({ 
            health: Object.fromEntries(allHealth) 
          })
        }

      case 'alerts':
        if (service) {
          const alerts = APIMonitoringService.getServiceAlerts(service)
          return NextResponse.json({ alerts })
        } else {
          const alerts = APIMonitoringService.getActiveAlerts()
          return NextResponse.json({ alerts })
        }

      case 'metrics':
        const days = parseInt(searchParams.get('days') || '7')
        if (service) {
          const metrics = APIMonitoringService.getUsageMetrics(service, days)
          return NextResponse.json({ metrics })
        } else {
          const youtubeMetrics = APIMonitoringService.getUsageMetrics('youtube', days)
          const githubMetrics = APIMonitoringService.getUsageMetrics('github', days)
          return NextResponse.json({ 
            metrics: { youtube: youtubeMetrics, github: githubMetrics } 
          })
        }

      case 'dashboard':
        const dashboardData = APIMonitoringService.getDashboardData()
        return NextResponse.json(dashboardData)

      case 'test':
        const testResults = await APIMonitoringService.testAllConnections()
        return NextResponse.json({ testResults })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: health, alerts, metrics, dashboard, or test' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('API monitoring error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action')

    switch (action) {
      case 'resolve-alert':
        const { alertId } = await request.json()
        if (!alertId) {
          return NextResponse.json(
            { error: 'Alert ID is required' },
            { status: 400 }
          )
        }

        const resolved = APIMonitoringService.resolveAlert(alertId)
        return NextResponse.json({ resolved })

      case 'cleanup':
        const { days } = await request.json()
        APIMonitoringService.cleanup(days || 30)
        return NextResponse.json({ success: true })

      case 'reset':
        // Only allow in development
        if (process.env.NODE_ENV === 'development') {
          APIMonitoringService.reset()
          return NextResponse.json({ success: true })
        } else {
          return NextResponse.json(
            { error: 'Reset only allowed in development' },
            { status: 403 }
          )
        }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: resolve-alert, cleanup, or reset' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('API monitoring POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}