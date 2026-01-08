# Development Guide

> Guidelines for developing features using the modular architecture of ThinkUni Note Sharing Platform.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Feature Development](#feature-development)
- [Code Standards](#code-standards)
- [Component Guidelines](#component-guidelines)
- [Hook Patterns](#hook-patterns)
- [API Development](#api-development)
- [Security & Utilities](#security--utilities)
- [Best Practices](#best-practices)

---

## Architecture Overview

### Feature-Based Modular Design

Each feature is self-contained and independent:

```
src/features/
├── admin/             # Administrative tools
├── analytics/         # Privacy-first usage analytics
├── auth/              # Authentication & authorization
├── collections/       # Resource collections
├── dashboard/         # Main dashboard
├── gamification/      # Points, badges, leaderboards
├── notifications/     # Notification & alert system
├── resources/         # Resource management
├── search/            # Advanced search
├── settings/          # User preferences
└── user-management/   # User administration
```

### Shared Resources

Common functionality is centralized:

```
src/shared/
├── components/        # Reusable UI components
├── hooks/             # Common custom hooks
├── utils/             # Utility functions
├── types/             # Global type definitions
└── config/            # Configuration files
```

### Application Structure

```
src/app/
├── (auth)/            # Authentication routes (login, register)
├── (dashboard)/       # Dashboard routes (protected)
├── admin/             # Admin panel routes
└── api/               # API routes (24 endpoints)
```

---

## Feature Development

### 1. Create Directory Structure

```bash
mkdir -p src/features/your-feature/{components,hooks,types,utils}
```

### 2. Set Up Exports

```typescript
// src/features/your-feature/index.ts
export * from './components'
export * from './hooks'
export * from './types'
export * from './utils'
```

### 3. Define Types

```typescript
// src/features/your-feature/types/index.ts
export interface YourFeatureData {
  id: string
  name: string
  description: string
  createdAt: Date
  updatedAt: Date
}
```

### 4. Create Components

```typescript
// src/features/your-feature/components/index.ts
export { YourFeatureMain } from './YourFeatureMain'
export { YourFeatureForm } from './YourFeatureForm'
```

---

## Code Standards

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `UserProfile.tsx` |
| Hooks | camelCase with 'use' | `useUserData.ts` |
| Types | camelCase | `user.types.ts` |
| Utils | camelCase | `userHelpers.ts` |

### Import Patterns

```typescript
// Good: Import from feature index
import { YourFeatureComponent, useYourFeatureData } from '@/features/your-feature'

// Good: Import shared components
import { Button, Modal } from '@/shared/components/ui'

// Avoid: Direct imports from internal files
import { Component } from '@/features/your-feature/components/Component'
```

---

## Component Guidelines

### Standard Template

```typescript
import { Button } from '@/shared/components/ui'
import { useFeatureData } from '../hooks'
import type { FeatureProps } from '../types'

interface ComponentProps extends FeatureProps {
  className?: string
  onAction?: () => void
}

export function FeatureComponent({ className, onAction }: ComponentProps) {
  const { data, loading, error } = useFeatureData()

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <div className={className}>
      <Button onClick={onAction}>Action</Button>
    </div>
  )
}
```

### Best Practices

1. **Single Responsibility** — One clear purpose per component
2. **TypeScript Props** — Use interfaces for all props
3. **Error Handling** — Handle loading and error states
4. **Accessibility** — Include ARIA labels
5. **Performance** — Use React.memo for expensive components

---

## Hook Patterns

### Data Fetching

```typescript
export function useFeatureData(filters?: FeatureFilters) {
  const [data, setData] = useState<FeatureData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const { data: result, error } = await supabase
          .from('feature_table')
          .select('*')
        if (error) throw error
        setData(result || [])
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [filters])

  return { data, loading, error }
}
```

### Actions

```typescript
export function useFeatureActions() {
  const [loading, setLoading] = useState(false)

  const createFeature = async (data: FeatureFormData) => {
    setLoading(true)
    try {
      const { data: result, error } = await supabase
        .from('feature_table')
        .insert(data)
        .select()
      if (error) throw error
      return result[0]
    } finally {
      setLoading(false)
    }
  }

  return { createFeature, loading }
}
```

---

## API Development

### Route Structure

```typescript
// src/app/api/features/route.ts
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')

    const { data, error, count } = await supabase
      .from('features')
      .select('*', { count: 'exact' })
      .range((page - 1) * limit, page * limit - 1)

    if (error) throw error

    return NextResponse.json({ data, total: count, page, limit })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch features' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { data, error } = await supabase
      .from('features')
      .insert(body)
      .select()

    if (error) throw error
    return NextResponse.json(data[0], { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create feature' },
      { status: 500 }
    )
  }
}
```

---

## Security & Utilities

### Privacy-First Analytics

```typescript
import { analytics } from '@/lib/services/privacy-analytics'

// Track page view
analytics.trackPageView('/dashboard')

// Track custom event
analytics.trackEvent({
  event_type: 'resource_download',
  resource_id: '123',
  metadata: { file_type: 'pdf' }
})
```

### Safe Logging & Data Masking

Always use the centralized logger which automatically masks sensitive data:

```typescript
import { logger } from '@/lib/logger'

// Safe: PII automatically masked
logger.info('User action', { user: userData, action: 'login' })
```

### Rate Limiting

```typescript
import { withRateLimit, rateLimitConfigs } from '@/lib/security'

export const POST = withRateLimit(async (req) => {
  // Your handler code
}, rateLimitConfigs.auth) // Options: api, auth, upload, search
```

### XSS Prevention

```typescript
import { highlightSearchTerms } from '@/lib/security/sanitize'

const safeHtml = highlightSearchTerms(userInput, searchQuery)
return <span dangerouslySetInnerHTML={{ __html: safeHtml }} />
```

---

## Best Practices

### Error Boundaries

```typescript
import { ErrorBoundary } from '@/shared/components/common'

function FeatureWrapper() {
  return (
    <ErrorBoundary fallback={<div>Feature failed to load</div>}>
      <FeatureComponent />
    </ErrorBoundary>
  )
}
```

### Loading States

```typescript
function FeatureComponent() {
  const { data, loading, error } = useFeatureData()

  if (loading) return <LoadingSpinner />
  if (error) return <ErrorMessage error={error} />
  if (!data?.length) return <EmptyState />

  return <FeatureContent data={data} />
}
```

### Code Splitting

```typescript
import { lazy, Suspense } from 'react'

const FeatureComponent = lazy(() => import('./FeatureComponent'))

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FeatureComponent />
    </Suspense>
  )
}
```

---

## Summary

Following these guidelines ensures:

- **Consistency** — All features follow the same patterns
- **Maintainability** — Code is easy to understand and modify
- **Scalability** — New features can be added without affecting existing ones
- **Type Safety** — TypeScript prevents runtime errors
- **Performance** — Optimized loading and rendering

---

**Questions?** Refer to existing feature implementations or open an issue.