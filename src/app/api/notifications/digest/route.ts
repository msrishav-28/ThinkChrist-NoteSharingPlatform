import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { emailDigestService } from '@/lib/services/email-digest-service'

export async function POST(request: Request) {
  try {
    const supabase = createClient()
    
    // This endpoint should be protected and only called by cron jobs or admin users
    const { searchParams } = new URL(request.url)
    const apiKey = searchParams.get('api_key')
    
    // In production, you should validate the API key
    if (!apiKey || apiKey !== process.env.DIGEST_API_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get inactive users (users who haven't been active in the last 7 days)
    const inactiveUsers = await emailDigestService.getInactiveUsers(7)
    
    let successCount = 0
    let errorCount = 0

    // Generate and send digest for each inactive user
    for (const userId of inactiveUsers) {
      try {
        const digestData = await emailDigestService.generateWeeklyDigest(userId)
        
        if (digestData) {
          // Only send if there's meaningful content
          const hasContent = digestData.newResources.length > 0 || 
                           digestData.achievements.length > 0

          if (hasContent) {
            const sent = await emailDigestService.sendDigestEmail(digestData)
            if (sent) {
              successCount++
            } else {
              errorCount++
            }
          }
        }
      } catch (error) {
        console.error(`Error processing digest for user ${userId}:`, error)
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      processed: inactiveUsers.length,
      sent: successCount,
      errors: errorCount
    })
  } catch (error) {
    console.error('Digest generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Manual digest generation for a specific user (for testing)
export async function GET(request: Request) {
  try {
    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const digestData = await emailDigestService.generateWeeklyDigest(user.id)
    
    if (!digestData) {
      return NextResponse.json({ error: 'Could not generate digest' }, { status: 400 })
    }

    // Return the digest data for preview (don't actually send email)
    return NextResponse.json({
      digestData,
      emailHTML: emailDigestService.generateEmailHTML(digestData)
    })
  } catch (error) {
    console.error('Manual digest generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}