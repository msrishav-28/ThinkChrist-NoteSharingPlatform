import type { LinkPreview } from '@/types'
import { CircuitBreakerManager } from '../circuit-breaker'
import { monitoredAPICall } from '../api-monitoring-middleware'

export interface GitHubRepoInfo {
  id: number
  name: string
  full_name: string
  description: string | null
  html_url: string
  clone_url: string
  language: string | null
  stargazers_count: number
  forks_count: number
  open_issues_count: number
  size: number
  created_at: string
  updated_at: string
  pushed_at: string
  owner: {
    login: string
    avatar_url: string
    type: string
  }
  topics: string[]
  license: {
    name: string
    spdx_id: string
  } | null
  default_branch: string
  archived: boolean
  disabled: boolean
  private: boolean
}

export interface GitHubRepoContent {
  name: string
  path: string
  type: 'file' | 'dir'
  size?: number
  download_url?: string
  content?: string
}

export interface GitHubRateLimit {
  limit: number
  remaining: number
  reset: number
  used: number
  resource: string
}

export interface GitHubAPIError {
  message: string
  documentation_url?: string
  errors?: Array<{
    resource: string
    field: string
    code: string
  }>
}

export interface GitHubAuthConfig {
  token?: string
  type: 'token' | 'app' | 'none'
  scopes?: string[]
}

export class GitHubPreviewGenerator {
  private static readonly API_BASE_URL = 'https://api.github.com'
  private static readonly MAX_RETRIES = 3
  private static readonly RETRY_DELAY_MS = 1000
  
  // Rate limit tracking (in production, this should be stored in Redis/database)
  private static rateLimitInfo = new Map<string, GitHubRateLimit>()
  
  /**
   * Generate preview for GitHub repository
   */
  static async generatePreview(url: string, userToken?: string): Promise<LinkPreview> {
    const repoInfo = this.extractRepoInfo(url)
    if (!repoInfo) {
      throw new Error('Invalid GitHub URL')
    }

    try {
      // Determine which token to use (user token takes precedence)
      const authConfig = this.getAuthConfig(userToken)
      
      // Check rate limits before making requests
      if (!this.canMakeAPICall(authConfig)) {
        console.warn('GitHub API rate limit exceeded, using fallback preview')
        return this.createBasicPreview(repoInfo, url)
      }
      
      // Try to get repo info from GitHub API
      const repoData = await monitoredAPICall('github', () =>
        this.fetchRepoInfoWithRetry(repoInfo.owner, repoInfo.repo, authConfig)
      )
      
      // Try to get README content for better description
      let readmeContent = ''
      try {
        readmeContent = await monitoredAPICall('github', () =>
          this.fetchReadmeContentWithRetry(repoInfo.owner, repoInfo.repo, authConfig)
        )
      } catch {
        // README fetch failed, continue without it
      }

      return this.createPreviewFromAPI(repoData, readmeContent)
    } catch (error) {
      console.warn('Failed to fetch GitHub repo info:', error)
      
      // Handle specific error cases
      if (error instanceof Error) {
        if (error.message.includes('private') || error.message.includes('404')) {
          // For private repos or not found, still create a basic preview
          return this.createBasicPreview(repoInfo, url, true)
        }
      }
      
      // Fallback to basic preview
      return this.createBasicPreview(repoInfo, url)
    }
  }

  /**
   * Get authentication configuration
   */
  private static getAuthConfig(userToken?: string): GitHubAuthConfig {
    const token = userToken || process.env.GITHUB_TOKEN
    
    if (token) {
      return {
        token,
        type: 'token',
        scopes: ['public_repo'] // Default scopes for public repositories
      }
    }
    
    return { type: 'none' }
  }

  /**
   * Check if we can make an API call based on rate limits
   */
  private static canMakeAPICall(authConfig: GitHubAuthConfig): boolean {
    const key = authConfig.token || 'anonymous'
    const rateLimit = this.rateLimitInfo.get(key)
    
    if (!rateLimit) {
      return true // No rate limit info yet, allow the call
    }
    
    // Check if rate limit has reset
    const now = Math.floor(Date.now() / 1000)
    if (now >= rateLimit.reset) {
      this.rateLimitInfo.delete(key) // Clear old rate limit info
      return true
    }
    
    // Check remaining requests
    return rateLimit.remaining > 0
  }

  /**
   * Update rate limit information from response headers
   */
  private static updateRateLimit(response: Response, authConfig: GitHubAuthConfig): void {
    const key = authConfig.token || 'anonymous'
    
    const limit = parseInt(response.headers.get('x-ratelimit-limit') || '0')
    const remaining = parseInt(response.headers.get('x-ratelimit-remaining') || '0')
    const reset = parseInt(response.headers.get('x-ratelimit-reset') || '0')
    const used = parseInt(response.headers.get('x-ratelimit-used') || '0')
    const resource = response.headers.get('x-ratelimit-resource') || 'core'
    
    if (limit > 0) {
      this.rateLimitInfo.set(key, {
        limit,
        remaining,
        reset,
        used,
        resource
      })
    }
  }

  /**
   * Fetch repo info with retry logic
   */
  private static async fetchRepoInfoWithRetry(
    owner: string, 
    repo: string, 
    authConfig: GitHubAuthConfig
  ): Promise<GitHubRepoInfo> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await this.fetchRepoInfo(owner, repo, authConfig)
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.message.includes('not found') || 
              error.message.includes('private') ||
              error.message.includes('rate limit')) {
            throw error
          }
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY_MS * Math.pow(2, attempt - 1))
        }
      }
    }
    
    throw lastError || new Error('Max retries exceeded')
  }

  /**
   * Fetch README content with retry logic
   */
  private static async fetchReadmeContentWithRetry(
    owner: string, 
    repo: string, 
    authConfig: GitHubAuthConfig
  ): Promise<string> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        return await this.fetchReadmeContent(owner, repo, authConfig)
      } catch (error) {
        lastError = error as Error
        
        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.message.includes('not found') || 
              error.message.includes('rate limit')) {
            throw error
          }
        }
        
        // Wait before retrying
        if (attempt < this.MAX_RETRIES) {
          await this.delay(this.RETRY_DELAY_MS * Math.pow(2, attempt - 1))
        }
      }
    }
    
    throw lastError || new Error('Max retries exceeded')
  }

  /**
   * Delay utility for retry logic
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Extract repository information from GitHub URL
   */
  static extractRepoInfo(url: string): { owner: string; repo: string; path?: string } | null {
    const patterns = [
      /github\.com\/([\w.-]+)\/([\w.-]+)(?:\/tree\/[\w.-]+)?(\/.*)?/,
      /github\.com\/([\w.-]+)\/([\w.-]+)(?:\.git)?$/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match) {
        return {
          owner: match[1],
          repo: match[2],
          path: match[3]
        }
      }
    }

    return null
  }

  /**
   * Fetch repository information from GitHub API with circuit breaker
   */
  private static async fetchRepoInfo(
    owner: string, 
    repo: string, 
    authConfig: GitHubAuthConfig
  ): Promise<GitHubRepoInfo> {
    const circuitBreaker = CircuitBreakerManager.getBreaker('github-api')
    
    return circuitBreaker.execute(async () => {
      const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ThinkChrist-Platform/1.0'
      }

      if (authConfig.token) {
        headers['Authorization'] = `Bearer ${authConfig.token}`
      }

      const response = await fetch(`${this.API_BASE_URL}/repos/${owner}/${repo}`, {
        headers,
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      // Update rate limit info
      this.updateRateLimit(response, authConfig)

      if (!response.ok) {
        const errorData = await response.json().catch(() => null) as GitHubAPIError | null
        
        if (response.status === 404) {
          throw new Error('Repository not found or is private')
        }
        
        if (response.status === 403) {
          // Check if it's a rate limit error
          if (response.headers.get('x-ratelimit-remaining') === '0') {
            const resetTime = response.headers.get('x-ratelimit-reset')
            const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : new Date()
            throw new Error(`GitHub API rate limit exceeded. Resets at ${resetDate.toISOString()}`)
          }
          
          // Check if it's a private repository
          if (errorData?.message?.includes('private')) {
            throw new Error('Repository is private and requires authentication')
          }
          
          throw new Error('GitHub API access forbidden - check token permissions')
        }
        
        if (response.status === 401) {
          throw new Error('GitHub API authentication failed - invalid token')
        }
        
        if (response.status >= 500) {
          throw new Error(`GitHub API server error: ${response.status}`)
        }
        
        throw new Error(`GitHub API error: ${response.status} - ${errorData?.message || 'Unknown error'}`)
      }

      const data = await response.json()
      
      // Validate required fields
      if (!data.name || !data.owner?.login) {
        throw new Error('Invalid repository data received from GitHub API')
      }
      
      return data
    })
  }

  /**
   * Fetch README content from repository
   */
  private static async fetchReadmeContent(
    owner: string, 
    repo: string, 
    authConfig: GitHubAuthConfig
  ): Promise<string> {
    const headers: Record<string, string> = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'ThinkChrist-Platform/1.0'
    }

    if (authConfig.token) {
      headers['Authorization'] = `Bearer ${authConfig.token}`
    }

    const response = await fetch(`${this.API_BASE_URL}/repos/${owner}/${repo}/readme`, {
      headers,
      signal: AbortSignal.timeout(5000) // 5 second timeout for README
    })

    // Update rate limit info
    this.updateRateLimit(response, authConfig)

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('README not found')
      }
      throw new Error(`Failed to fetch README: ${response.status}`)
    }

    const data = await response.json()
    
    if (!data.content) {
      throw new Error('README content not available')
    }
    
    try {
      // Decode base64 content
      const content = atob(data.content.replace(/\s/g, ''))
      
      // Remove markdown headers and extract meaningful content
      const cleanContent = content
        .replace(/^#+\s+.*$/gm, '') // Remove markdown headers
        .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
        .replace(/\[.*?\]\(.*?\)/g, '$1') // Convert links to text
        .replace(/`{1,3}[\s\S]*?`{1,3}/g, '') // Remove code blocks
        .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
        .trim()
      
      // Extract first meaningful paragraph
      const paragraphs = cleanContent.split('\n\n').filter(p => p.trim().length > 20)
      const firstParagraph = paragraphs[0] || cleanContent.substring(0, 200)
      
      return firstParagraph.length > 200 
        ? firstParagraph.substring(0, 200) + '...'
        : firstParagraph
    } catch (error) {
      throw new Error('Failed to decode README content')
    }
  }

  /**
   * Create preview from GitHub API data
   */
  private static createPreviewFromAPI(repoData: GitHubRepoInfo, readmeContent: string): LinkPreview {
    const description = readmeContent || repoData.description || 'GitHub Repository'
    
    // Format additional info
    const stats = []
    if (repoData.language) stats.push(`Language: ${repoData.language}`)
    if (repoData.stargazers_count > 0) stats.push(`⭐ ${repoData.stargazers_count}`)
    if (repoData.forks_count > 0) stats.push(`🍴 ${repoData.forks_count}`)
    
    const fullDescription = `${description}${stats.length > 0 ? `\n\n${stats.join(' • ')}` : ''}`

    return {
      title: repoData.full_name,
      description: fullDescription,
      thumbnail: repoData.owner.avatar_url,
      favicon: 'https://github.com/favicon.ico',
      type: 'github',
      metadata: {
        owner: repoData.owner.login,
        repo: repoData.name,
        full_name: repoData.full_name,
        language: repoData.language,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        issues: repoData.open_issues_count,
        size: repoData.size,
        topics: repoData.topics || [],
        license: repoData.license?.name,
        created_at: repoData.created_at,
        updated_at: repoData.updated_at,
        pushed_at: repoData.pushed_at,
        default_branch: repoData.default_branch,
        archived: repoData.archived,
        private: repoData.private,
        clone_url: repoData.clone_url,
        readme_excerpt: readmeContent
      },
      cached_at: new Date().toISOString()
    }
  }

  /**
   * Create basic preview without API (fallback)
   */
  private static createBasicPreview(
    repoInfo: { owner: string; repo: string; path?: string }, 
    url: string,
    isPrivate = false
  ): LinkPreview {
    const description = isPrivate 
      ? 'Private GitHub Repository (authentication required for details)'
      : 'GitHub Repository'
    
    return {
      title: `${repoInfo.owner}/${repoInfo.repo}`,
      description,
      favicon: 'https://github.com/favicon.ico',
      type: 'github',
      metadata: {
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        full_name: `${repoInfo.owner}/${repoInfo.repo}`,
        url,
        fallback: true,
        private: isPrivate
      },
      cached_at: new Date().toISOString()
    }
  }

  /**
   * Validate GitHub URL
   */
  static isGitHubUrl(url: string): boolean {
    return /github\.com\/[\w.-]+\/[\w.-]+/.test(url)
  }

  /**
   * Get repository API URL
   */
  static getApiUrl(owner: string, repo: string): string {
    return `${this.API_BASE_URL}/repos/${owner}/${repo}`
  }

  /**
   * Get repository clone URL
   */
  static getCloneUrl(owner: string, repo: string, useSSH = false): string {
    return useSSH 
      ? `git@github.com:${owner}/${repo}.git`
      : `https://github.com/${owner}/${repo}.git`
  }

  /**
   * Get repository archive URL
   */
  static getArchiveUrl(owner: string, repo: string, format: 'zip' | 'tar' = 'zip'): string {
    return `https://github.com/${owner}/${repo}/archive/refs/heads/main.${format}`
  }

  /**
   * Parse GitHub URL to get different components
   */
  static parseUrl(url: string): {
    owner: string
    repo: string
    type: 'repo' | 'file' | 'tree' | 'blob'
    branch?: string
    path?: string
  } | null {
    const repoMatch = url.match(/github\.com\/([\w.-]+)\/([\w.-]+)(?:\/(.*))?/)
    if (!repoMatch) return null

    const owner = repoMatch[1]
    const repo = repoMatch[2]
    const rest = repoMatch[3]

    if (!rest) {
      return { owner, repo, type: 'repo' }
    }

    const pathMatch = rest.match(/^(tree|blob)\/([\w.-]+)(?:\/(.*))?/)
    if (pathMatch) {
      return {
        owner,
        repo,
        type: pathMatch[1] as 'tree' | 'blob',
        branch: pathMatch[2],
        path: pathMatch[3]
      }
    }

    return { owner, repo, type: 'repo' }
  }

  /**
   * Get current rate limit information for monitoring
   */
  static getRateLimit(token?: string): GitHubRateLimit | null {
    const key = token || process.env.GITHUB_TOKEN || 'anonymous'
    return this.rateLimitInfo.get(key) || null
  }

  /**
   * Get all rate limit information for monitoring dashboard
   */
  static getAllRateLimits(): Map<string, GitHubRateLimit> {
    return new Map(this.rateLimitInfo)
  }

  /**
   * Reset rate limit tracking (for testing or manual reset)
   */
  static resetRateLimit(token?: string): void {
    const key = token || process.env.GITHUB_TOKEN || 'anonymous'
    this.rateLimitInfo.delete(key)
  }

  /**
   * Check if GitHub API is configured
   */
  static isAPIConfigured(): boolean {
    return !!process.env.GITHUB_TOKEN
  }

  /**
   * Validate GitHub token format
   */
  static validateToken(token: string): boolean {
    // GitHub personal access tokens start with 'ghp_' and are 40 characters
    // GitHub app tokens start with 'ghs_' and are 40 characters
    // Classic tokens are 40 character hex strings
    return /^(ghp_[A-Za-z0-9]{36}|ghs_[A-Za-z0-9]{36}|[a-f0-9]{40})$/.test(token)
  }

  /**
   * Test API connectivity and token validity
   */
  static async testAPIConnection(token?: string): Promise<{ 
    success: boolean; 
    error?: string; 
    rateLimit?: GitHubRateLimit;
    scopes?: string[];
  }> {
    try {
      const testToken = token || process.env.GITHUB_TOKEN
      if (!testToken) {
        return { success: false, error: 'No token provided' }
      }

      const authConfig = this.getAuthConfig(testToken)
      
      // Test with a simple API call to get rate limit info
      const response = await monitoredAPICall('github', () =>
        fetch(`${this.API_BASE_URL}/rate_limit`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'ThinkChrist-Platform/1.0',
            'Authorization': `Bearer ${testToken}`
          }
        })
      )

      if (!response.ok) {
        return { 
          success: false, 
          error: `API test failed: ${response.status} ${response.statusText}` 
        }
      }

      const data = await response.json()
      const scopes = response.headers.get('x-oauth-scopes')?.split(', ') || []
      
      this.updateRateLimit(response, authConfig)
      
      return { 
        success: true,
        rateLimit: this.getRateLimit(testToken) || undefined,
        scopes
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }
    }
  }

  /**
   * Check if token has required scopes for private repositories
   */
  static hasPrivateRepoAccess(scopes: string[]): boolean {
    return scopes.includes('repo') || scopes.includes('private_repo')
  }

  /**
   * Get repository access level based on token scopes
   */
  static getAccessLevel(scopes: string[]): 'none' | 'public' | 'private' {
    if (scopes.includes('repo')) {
      return 'private' // Full repository access
    }
    if (scopes.includes('public_repo')) {
      return 'public' // Public repository access only
    }
    return 'none' // No repository access
  }
}