'use client'

import { EnhancedLeaderboard } from './enhanced-leaderboard'

// Legacy component - redirects to enhanced version
export function LeaderboardTable(props: any) {
  return <EnhancedLeaderboard {...props} />
}