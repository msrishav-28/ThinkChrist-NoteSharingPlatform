'use client'

import { UserProgressCard } from './user-progress-card'

// Legacy component - redirects to enhanced version
export function UserRankCard(props: any) {
  return <UserProgressCard {...props} compact={true} />
}