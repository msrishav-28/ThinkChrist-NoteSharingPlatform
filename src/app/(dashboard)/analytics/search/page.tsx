'use client'

import { SearchAnalyticsDashboard } from '@/components/search/search-analytics-dashboard'
import { useAuth } from '@/features/auth'

export default function SearchAnalyticsPage() {
  const { user } = useAuth()

  return (
    <div className="container mx-auto py-6">
      <SearchAnalyticsDashboard userId={user?.id} />
    </div>
  )
}