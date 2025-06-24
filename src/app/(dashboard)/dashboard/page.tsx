import { StatsCards } from '@/components/dashboard/stats-cards'
import { RecentUploads } from '@/components/dashboard/recent-uploads'
import { ActivityFeed } from '@/components/dashboard/activity-feed'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here's your activity overview.
        </p>
      </div>
      
      <StatsCards />
      
      <div className="grid gap-6 md:grid-cols-2">
        <RecentUploads />
        <ActivityFeed />
      </div>
    </div>
  )
}