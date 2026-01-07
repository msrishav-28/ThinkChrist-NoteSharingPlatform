/**
 * API Route: Log User Activity
 * POST /api/tracking/log
 * 
 * Logs user activity to the tracking system if user has given consent
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseUserAgent, getGeoFromIP } from '@/lib/services/tracking-service'

export async function POST(request: NextRequest) {
    try {
        const supabase = createClient()

        // Get authenticated user
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        // Check if user has tracking consent
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('tracking_consent')
            .eq('id', user.id)
            .single()

        if (userError || !userData?.tracking_consent) {
            // User hasn't consented - return success but don't log
            return NextResponse.json({ logged: false, reason: 'no_consent' })
        }

        // Parse request body
        const body = await request.json()
        const { activityType, activityData = {}, pagePath } = body

        if (!activityType) {
            return NextResponse.json({ error: 'Missing activityType' }, { status: 400 })
        }

        // Get IP address from headers
        const forwardedFor = request.headers.get('x-forwarded-for')
        const realIp = request.headers.get('x-real-ip')
        const ip = forwardedFor?.split(',')[0]?.trim() || realIp || '127.0.0.1'

        // Get User-Agent
        const userAgent = request.headers.get('user-agent') || ''

        // Parse device info
        const deviceInfo = parseUserAgent(userAgent)

        // Get geolocation (async, but we'll await it)
        const geoInfo = await getGeoFromIP(ip)

        // Insert tracking log using service role (bypasses RLS)
        // Note: In production, you'd use a service role client here
        // For now, we'll insert with a special admin endpoint or use RPC
        const { error: insertError } = await supabase
            .rpc('insert_tracking_log', {
                p_user_id: user.id,
                p_ip_address: ip,
                p_user_agent: userAgent,
                p_device_type: deviceInfo.deviceType,
                p_os: deviceInfo.os,
                p_browser: deviceInfo.browser,
                p_city: geoInfo.city,
                p_state: geoInfo.state,
                p_country: geoInfo.country,
                p_country_code: geoInfo.countryCode,
                p_activity_type: activityType,
                p_activity_data: activityData,
                p_page_path: pagePath || null
            })

        if (insertError) {
            console.error('Tracking insert error:', insertError)
            // Don't expose internal errors
            return NextResponse.json({ logged: false, reason: 'error' })
        }

        return NextResponse.json({ logged: true })

    } catch (error) {
        console.error('Tracking API error:', error)
        return NextResponse.json({ logged: false, reason: 'error' })
    }
}
