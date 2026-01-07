import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { logger } from '@/lib/logger'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // This is expected in Server Components where cookies are read-only
            // Only log in development for debugging purposes
            logger.debug('Cookie set operation failed (expected in Server Components)', {
              component: 'supabase-server',
              action: 'cookie-set',
              cookieName: name
            })
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // This is expected in Server Components where cookies are read-only
            // Only log in development for debugging purposes
            logger.debug('Cookie remove operation failed (expected in Server Components)', {
              component: 'supabase-server',
              action: 'cookie-remove',
              cookieName: name
            })
          }
        },
      },
    }
  )
}
