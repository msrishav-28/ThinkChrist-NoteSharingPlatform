// Authentication feature types
import { User as SupabaseUser } from '@supabase/supabase-js'
import { User as DBUser } from '@/types'

export interface AuthContextType {
  user: SupabaseUser | null
  profile: DBUser | null
  loading: boolean
  signOut: () => Promise<void>
}

export interface LoginFormData {
  email: string
  password: string
}

export interface RegisterFormData {
  email: string
  password: string
  full_name: string
  department: string
  semester: string
}

export interface AuthUser extends SupabaseUser {
  profile?: DBUser
}

export type AuthState = 'loading' | 'authenticated' | 'unauthenticated'