import { createClient } from '@/lib/supabase/server'

export interface DigestData {
  user: {
    id: string
    email: string
    full_name: string
    department: string
  }
  newResources: Array<{
    id: string
    title: string
    department: string
    course: string
    uploaded_by: string
    uploader_name: string
    created_at: string
  }>
  achievements: Array<{
    title: string
    points: number
    created_at: string
  }>
  departmentStats: {
    totalResources: number
    totalUsers: number
    topContributors: Array<{
      name: string
      points: number
    }>
  }
}

export class EmailDigestService {
  private _supabase: ReturnType<typeof createClient> | null = null
  
  private get supabase() {
    if (!this._supabase) {
      this._supabase = createClient()
    }
    return this._supabase
  }

  async generateWeeklyDigest(userId: string): Promise<DigestData | null> {
    try {
      // Get user info
      const { data: user, error: userError } = await this.supabase
        .from('users')
        .select('id, email, full_name, department')
        .eq('id', userId)
        .single()

      if (userError || !user) {
        console.error('Error fetching user:', userError)
        return null
      }

      // Get user preferences to check if they want email digest
      const { data: preferences } = await this.supabase
        .from('user_preferences')
        .select('notification_settings')
        .eq('user_id', userId)
        .single()

      if (preferences && !preferences.notification_settings?.email_digest) {
        return null // User has disabled email digest
      }

      const oneWeekAgo = new Date()
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

      // Get new resources in user's department from the last week
      const { data: newResources, error: resourcesError } = await this.supabase
        .from('resources')
        .select(`
          id,
          title,
          department,
          course,
          uploaded_by,
          created_at,
          users!resources_uploaded_by_fkey(full_name)
        `)
        .eq('department', user.department)
        .gte('created_at', oneWeekAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(10)

      if (resourcesError) {
        console.error('Error fetching new resources:', resourcesError)
      }

      // Get user's recent achievements
      const { data: achievements, error: achievementsError } = await this.supabase
        .from('notifications')
        .select('title, data, created_at')
        .eq('user_id', userId)
        .eq('type', 'achievement')
        .gte('created_at', oneWeekAgo.toISOString())
        .order('created_at', { ascending: false })

      if (achievementsError) {
        console.error('Error fetching achievements:', achievementsError)
      }

      // Get department statistics
      const { data: departmentUsers, error: usersError } = await this.supabase
        .from('users')
        .select('id, full_name, points')
        .eq('department', user.department)
        .order('points', { ascending: false })
        .limit(5)

      if (usersError) {
        console.error('Error fetching department users:', usersError)
      }

      const { count: totalResources } = await this.supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('department', user.department)

      const { count: totalUsers } = await this.supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('department', user.department)

      return {
        user,
        newResources: (newResources || []).map(resource => ({
          id: resource.id,
          title: resource.title,
          department: resource.department,
          course: resource.course,
          uploaded_by: resource.uploaded_by,
          uploader_name: (resource.users as any)?.full_name || 'Unknown',
          created_at: resource.created_at
        })),
        achievements: (achievements || []).map(achievement => ({
          title: achievement.data?.achievement || achievement.title,
          points: achievement.data?.points || 0,
          created_at: achievement.created_at
        })),
        departmentStats: {
          totalResources: totalResources || 0,
          totalUsers: totalUsers || 0,
          topContributors: (departmentUsers || []).map(user => ({
            name: user.full_name,
            points: user.points
          }))
        }
      }
    } catch (error) {
      console.error('Error generating weekly digest:', error)
      return null
    }
  }

  async getInactiveUsers(daysSinceLastActivity: number = 7): Promise<string[]> {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastActivity)

      // Get users who haven't had any interactions recently
      const { data: activeUsers } = await this.supabase
        .from('user_interactions')
        .select('user_id')
        .gte('created_at', cutoffDate.toISOString())

      const activeUserIds = new Set((activeUsers || []).map(u => u.user_id))

      // Get all users with email digest enabled
      const { data: allUsers } = await this.supabase
        .from('users')
        .select(`
          id,
          user_preferences!inner(notification_settings)
        `)

      const inactiveUsers = (allUsers || [])
        .filter(user => {
          const hasEmailDigest = (user.user_preferences as any)?.notification_settings?.email_digest !== false
          return hasEmailDigest && !activeUserIds.has(user.id)
        })
        .map(user => user.id)

      return inactiveUsers
    } catch (error) {
      console.error('Error getting inactive users:', error)
      return []
    }
  }

  generateEmailHTML(digestData: DigestData): string {
    const { user, newResources, achievements, departmentStats } = digestData

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>ThinkChrist Weekly Digest</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .section { margin: 20px 0; padding: 15px; border-left: 4px solid #2563eb; }
          .resource-item { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; }
          .achievement { background: #fef3c7; border-left-color: #f59e0b; }
          .stats { background: #ecfdf5; border-left-color: #10b981; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>ThinkChrist Weekly Digest</h1>
            <p>Hello ${user.full_name}! Here's what happened this week in ${user.department}.</p>
          </div>

          ${newResources.length > 0 ? `
          <div class="section">
            <h2>📚 New Resources This Week</h2>
            ${newResources.map(resource => `
              <div class="resource-item">
                <strong>${resource.title}</strong><br>
                <small>${resource.course} • Uploaded by ${resource.uploader_name}</small>
              </div>
            `).join('')}
          </div>
          ` : ''}

          ${achievements.length > 0 ? `
          <div class="section achievement">
            <h2>🏆 Your Achievements</h2>
            ${achievements.map(achievement => `
              <div class="resource-item">
                <strong>${achievement.title}</strong><br>
                <small>+${achievement.points} points</small>
              </div>
            `).join('')}
          </div>
          ` : ''}

          <div class="section stats">
            <h2>📊 Department Stats</h2>
            <p><strong>Total Resources:</strong> ${departmentStats.totalResources}</p>
            <p><strong>Active Users:</strong> ${departmentStats.totalUsers}</p>
            <h3>Top Contributors:</h3>
            ${departmentStats.topContributors.map((contributor, index) => `
              <p>${index + 1}. ${contributor.name} - ${contributor.points} points</p>
            `).join('')}
          </div>

          <div class="footer">
            <p>You're receiving this because you have email digest enabled in your preferences.</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/settings">Update your preferences</a></p>
          </div>
        </div>
      </body>
      </html>
    `
  }

  // This would typically integrate with an email service like SendGrid, AWS SES, etc.
  async sendDigestEmail(digestData: DigestData): Promise<boolean> {
    try {
      // In a real implementation, you would send the email here
      // For now, we'll just log it
      console.log(`Would send digest email to ${digestData.user.email}`)
      console.log('Email content:', this.generateEmailHTML(digestData))
      
      // TODO: Integrate with actual email service
      // Example with a hypothetical email service:
      // await emailService.send({
      //   to: digestData.user.email,
      //   subject: 'ThinkChrist Weekly Digest',
      //   html: this.generateEmailHTML(digestData)
      // })

      return true
    } catch (error) {
      console.error('Error sending digest email:', error)
      return false
    }
  }
}

export const emailDigestService = new EmailDigestService()