export interface User {
  id: string
  email: string
  full_name: string
  department: string
  semester: number
  points: number
  badge_level: string
  created_at: string
  updated_at: string
}

export interface Resource {
  id: string
  title: string
  description: string | null
  file_url: string
  file_name: string
  file_size: number
  file_type: string
  department: string
  course: string
  semester: number
  subject: string
  topic: string | null
  uploaded_by: string
  uploader?: User
  upvotes: number
  downvotes: number
  downloads: number
  is_verified: boolean
  created_at: string
  updated_at: string
  user_vote?: 'upvote' | 'downvote' | null
}

export interface Vote {
  id: string
  user_id: string
  resource_id: string
  vote_type: 'upvote' | 'downvote'
  created_at: string
}

export interface Contribution {
  id: string
  user_id: string
  type: 'upload' | 'vote' | 'download'
  resource_id: string
  points_earned: number
  created_at: string
}

export interface LeaderboardEntry {
  user_id: string
  full_name: string
  department: string
  total_points: number
  uploads_count: number
  badge_level: string
  rank: number
}