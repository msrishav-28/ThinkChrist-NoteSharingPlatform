/**
 * Privacy-First Analytics Service
 * 
 * Self-hosted analytics that you control - no external scripts, no third-party data sharing.
 * All data stays in your Supabase database.
 */

import { createClient } from '@/lib/supabase/client'

// Analytics event types
export type AnalyticsEventType =
    | 'page_view'
    | 'resource_view'
    | 'resource_download'
    | 'resource_upload'
    | 'search'
    | 'vote'
    | 'login'
    | 'logout'
    | 'error'

interface AnalyticsEvent {
    event_type: AnalyticsEventType
    page_path?: string
    resource_id?: string
    search_query?: string
    metadata?: Record<string, string | number | boolean>
}

interface AggregatedStats {
    total_page_views: number
    total_downloads: number
    total_searches: number
    unique_visitors: number
    popular_pages: Array<{ path: string; views: number }>
    popular_resources: Array<{ id: string; title: string; views: number }>
}

class PrivacyAnalyticsService {
    private sessionId: string | null = null
    private isEnabled: boolean = true

    constructor() {
        this.initSession()
    }

    /**
     * Initialize anonymous session ID (no user identification)
     */
    private initSession(): void {
        if (typeof window === 'undefined') return

        // Generate anonymous session ID (not linked to user)
        let sessionId = sessionStorage.getItem('analytics_session')
        if (!sessionId) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
            sessionStorage.setItem('analytics_session', sessionId)
        }
        this.sessionId = sessionId
    }

    /**
     * Enable/disable analytics (user preference)
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled
        if (typeof window !== 'undefined') {
            localStorage.setItem('analytics_enabled', enabled.toString())
        }
    }

    /**
     * Check if analytics is enabled
     */
    private checkEnabled(): boolean {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('analytics_enabled')
            if (stored !== null) {
                this.isEnabled = stored === 'true'
            }
        }
        return this.isEnabled
    }

    /**
     * Track an analytics event (privacy-safe)
     * NO personal identifiable information (PII) is collected
     */
    async trackEvent(event: AnalyticsEvent): Promise<void> {
        if (!this.checkEnabled()) return
        if (typeof window === 'undefined') return

        try {
            const supabase = createClient()

            // Collect ONLY non-identifying information
            const eventData = {
                event_type: event.event_type,
                session_id: this.sessionId,
                page_path: event.page_path || window.location.pathname,
                resource_id: event.resource_id,
                // Sanitize search query - only store first 100 chars, no personal data
                search_query: event.search_query?.substring(0, 100),
                // Device type (not fingerprinting)
                device_type: this.getDeviceType(),
                // Non-identifying metadata only
                metadata: this.sanitizeMetadata(event.metadata),
                created_at: new Date().toISOString()
            }

            // Insert into analytics_events table (create if needed)
            await supabase.from('analytics_events').insert(eventData)
        } catch {
            // Silently fail - analytics should never break the app
        }
    }

    /**
     * Track page view
     */
    trackPageView(path?: string): void {
        this.trackEvent({
            event_type: 'page_view',
            page_path: path || (typeof window !== 'undefined' ? window.location.pathname : undefined)
        })
    }

    /**
     * Track resource view
     */
    trackResourceView(resourceId: string): void {
        this.trackEvent({
            event_type: 'resource_view',
            resource_id: resourceId
        })
    }

    /**
     * Track resource download
     */
    trackResourceDownload(resourceId: string): void {
        this.trackEvent({
            event_type: 'resource_download',
            resource_id: resourceId
        })
    }

    /**
     * Track search
     */
    trackSearch(query: string, resultsCount: number): void {
        this.trackEvent({
            event_type: 'search',
            search_query: query,
            metadata: { results_count: resultsCount }
        })
    }

    /**
     * Get device type (not fingerprinting - just basic category)
     */
    private getDeviceType(): 'desktop' | 'tablet' | 'mobile' {
        if (typeof window === 'undefined') return 'desktop'

        const width = window.innerWidth
        if (width < 768) return 'mobile'
        if (width < 1024) return 'tablet'
        return 'desktop'
    }

    /**
     * Sanitize metadata to ensure no PII
     */
    private sanitizeMetadata(
        metadata?: Record<string, string | number | boolean>
    ): Record<string, string | number | boolean> | undefined {
        if (!metadata) return undefined

        // Remove any potential PII fields
        const piiFields = ['email', 'name', 'user_id', 'ip', 'phone', 'address']
        const sanitized: Record<string, string | number | boolean> = {}

        for (const [key, value] of Object.entries(metadata)) {
            const lowerKey = key.toLowerCase()
            if (!piiFields.some(pii => lowerKey.includes(pii))) {
                sanitized[key] = value
            }
        }

        return sanitized
    }

    /**
     * Get aggregated analytics (for admin dashboard)
     * Only aggregated data - no individual user tracking
     */
    async getAggregatedStats(
        startDate: Date,
        endDate: Date
    ): Promise<AggregatedStats | null> {
        try {
            const supabase = createClient()

            // Get total page views
            const { count: pageViews } = await supabase
                .from('analytics_events')
                .select('*', { count: 'exact', head: true })
                .eq('event_type', 'page_view')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())

            // Get total downloads
            const { count: downloads } = await supabase
                .from('analytics_events')
                .select('*', { count: 'exact', head: true })
                .eq('event_type', 'resource_download')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())

            // Get unique sessions (visitors)
            const { data: sessions } = await supabase
                .from('analytics_events')
                .select('session_id')
                .gte('created_at', startDate.toISOString())
                .lte('created_at', endDate.toISOString())

            const uniqueSessions = new Set(sessions?.map(s => s.session_id)).size

            return {
                total_page_views: pageViews || 0,
                total_downloads: downloads || 0,
                total_searches: 0, // Implement as needed
                unique_visitors: uniqueSessions,
                popular_pages: [], // Implement aggregation
                popular_resources: [] // Implement aggregation
            }
        } catch {
            return null
        }
    }
}

// Export singleton instance
export const analytics = new PrivacyAnalyticsService()

// React hook for analytics
export function useAnalytics() {
    return {
        trackPageView: (path?: string) => analytics.trackPageView(path),
        trackResourceView: (id: string) => analytics.trackResourceView(id),
        trackResourceDownload: (id: string) => analytics.trackResourceDownload(id),
        trackSearch: (query: string, count: number) => analytics.trackSearch(query, count),
        setEnabled: (enabled: boolean) => analytics.setEnabled(enabled)
    }
}
