import { APIMonitoringDashboard } from '@/components/admin/api-monitoring-dashboard'

export default function MonitoringPage() {
  return (
    <div className="container mx-auto py-8">
      <APIMonitoringDashboard />
    </div>
  )
}

import { config } from '@/shared/config'

export const metadata = {
  title: `API Monitoring - ${config.branding.appName} Admin`,
  description: 'Monitor external API usage and performance'
}