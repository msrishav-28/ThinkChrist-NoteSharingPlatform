import { APIMonitoringDashboard } from '@/components/admin/api-monitoring-dashboard'

export default function MonitoringPage() {
  return (
    <div className="container mx-auto py-8">
      <APIMonitoringDashboard />
    </div>
  )
}

export const metadata = {
  title: 'API Monitoring - ThinkChrist Admin',
  description: 'Monitor external API usage and performance'
}