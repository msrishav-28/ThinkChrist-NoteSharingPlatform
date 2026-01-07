import { thinkchristConfig } from './thinkchrist/config'

// Map of available clients
const clients: Record<string, typeof thinkchristConfig> = {
    thinkchrist: thinkchristConfig,
}

// Get client ID from environment variable
const clientId = process.env.NEXT_PUBLIC_CLIENT_ID || 'thinkchrist'

// Export the current client configuration
// Default to thinkchrist if client ID not found
export const currentClient = clients[clientId] || thinkchristConfig
