/**
 * User Tracking Service
 * Handles activity logging, device detection, and IP geolocation
 */

import { createClient } from '@/lib/supabase/client'

// Activity types that can be tracked
export type ActivityType =
    | 'login'
    | 'logout'
    | 'page_view'
    | 'resource_view'
    | 'resource_upload'
    | 'resource_download'
    | 'search'
    | 'vote'
    | 'profile_update'
    | 'collection_create'
    | 'collection_view'

interface DeviceInfo {
    deviceType: 'mobile' | 'tablet' | 'desktop'
    os: string
    browser: string
}

interface GeoLocation {
    city: string | null
    state: string | null
    country: string | null
    countryCode: string | null
}

interface TrackingPayload {
    activityType: ActivityType
    activityData?: Record<string, unknown>
    pagePath?: string
}

/**
 * Parse User-Agent string to extract device information
 */
export function parseUserAgent(userAgent: string): DeviceInfo {
    const ua = userAgent.toLowerCase()

    // Detect device type
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop'
    if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(ua)) {
        deviceType = 'mobile'
    } else if (/tablet|ipad|playbook|silk/i.test(ua)) {
        deviceType = 'tablet'
    }

    // Detect OS
    let os = 'Unknown'
    if (/windows nt 10/i.test(ua)) os = 'Windows 10/11'
    else if (/windows nt 6.3/i.test(ua)) os = 'Windows 8.1'
    else if (/windows nt 6.2/i.test(ua)) os = 'Windows 8'
    else if (/windows nt 6.1/i.test(ua)) os = 'Windows 7'
    else if (/windows/i.test(ua)) os = 'Windows'
    else if (/macintosh|mac os x/i.test(ua)) os = 'macOS'
    else if (/linux/i.test(ua)) os = 'Linux'
    else if (/android/i.test(ua)) os = 'Android'
    else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS'

    // Detect Browser
    let browser = 'Unknown'
    if (/edg/i.test(ua)) browser = 'Edge'
    else if (/chrome/i.test(ua) && !/chromium/i.test(ua)) browser = 'Chrome'
    else if (/firefox/i.test(ua)) browser = 'Firefox'
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari'
    else if (/opera|opr/i.test(ua)) browser = 'Opera'
    else if (/msie|trident/i.test(ua)) browser = 'Internet Explorer'

    return { deviceType, os, browser }
}

/**
 * Get geolocation from IP address using free API
 * Uses ip-api.com (free, no API key required, 45 req/min limit)
 */
export async function getGeoFromIP(ip: string): Promise<GeoLocation> {
    try {
        // Skip for localhost/private IPs
        if (ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
            return { city: 'Local', state: 'Local', country: 'Local', countryCode: 'LO' }
        }

        const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,regionName,country,countryCode`)

        if (!response.ok) {
            throw new Error('Geo API failed')
        }

        const data = await response.json()

        if (data.status === 'success') {
            return {
                city: data.city || null,
                state: data.regionName || null,
                country: data.country || null,
                countryCode: data.countryCode || null
            }
        }

        return { city: null, state: null, country: null, countryCode: null }
    } catch (error) {
        console.error('Geolocation lookup failed:', error)
        return { city: null, state: null, country: null, countryCode: null }
    }
}

/**
 * Check if user has given tracking consent
 */
export async function hasTrackingConsent(userId: string): Promise<boolean> {
    try {
        const supabase = createClient()
        const { data, error } = await supabase
            .from('users')
            .select('tracking_consent')
            .eq('id', userId)
            .single()

        if (error || !data) return false
        return data.tracking_consent === true
    } catch {
        return false
    }
}

/**
 * Log user activity (client-side call to API)
 */
export async function trackActivity(payload: TrackingPayload): Promise<void> {
    try {
        await fetch('/api/tracking/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
    } catch (error) {
        // Silently fail - tracking should never break user experience
        console.debug('Tracking failed:', error)
    }
}

/**
 * Convenience methods for common activities
 */
export const track = {
    pageView: (path: string) =>
        trackActivity({ activityType: 'page_view', pagePath: path }),

    resourceView: (resourceId: string, resourceTitle: string) =>
        trackActivity({
            activityType: 'resource_view',
            activityData: { resourceId, resourceTitle }
        }),

    resourceUpload: (resourceId: string, resourceType: string) =>
        trackActivity({
            activityType: 'resource_upload',
            activityData: { resourceId, resourceType }
        }),

    resourceDownload: (resourceId: string) =>
        trackActivity({
            activityType: 'resource_download',
            activityData: { resourceId }
        }),

    search: (query: string, resultsCount: number) =>
        trackActivity({
            activityType: 'search',
            activityData: { query, resultsCount }
        }),

    vote: (resourceId: string, voteType: 'up' | 'down') =>
        trackActivity({
            activityType: 'vote',
            activityData: { resourceId, voteType }
        }),

    login: () => trackActivity({ activityType: 'login' }),

    logout: () => trackActivity({ activityType: 'logout' })
}
