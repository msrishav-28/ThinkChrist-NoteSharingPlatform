'use client'

import { usePathname } from 'next/navigation'
import { Home, Search, FolderOpen, FileText, Settings, Users } from 'lucide-react'
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

interface BreadcrumbSegment {
  label: string
  href?: string
  icon?: React.ComponentType<{ className?: string }>
}

interface NavigationBreadcrumbProps {
  customSegments?: BreadcrumbSegment[]
  className?: string
}

export function NavigationBreadcrumb({ customSegments, className }: NavigationBreadcrumbProps) {
  const pathname = usePathname()
  
  // Generate breadcrumb segments based on current path
  const generateSegments = (): BreadcrumbSegment[] => {
    if (customSegments) return customSegments

    const segments: BreadcrumbSegment[] = [
      { label: 'Home', href: '/', icon: Home }
    ]

    const pathParts = pathname.split('/').filter(Boolean)
    
    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i]
      const href = '/' + pathParts.slice(0, i + 1).join('/')
      const isLast = i === pathParts.length - 1

      switch (part) {
        case 'resources':
          segments.push({
            label: 'Resources',
            href: isLast ? undefined : href,
            icon: FileText
          })
          break
        case 'collections':
          segments.push({
            label: 'Collections',
            href: isLast ? undefined : href,
            icon: FolderOpen
          })
          break
        case 'search':
          segments.push({
            label: 'Search',
            href: isLast ? undefined : href,
            icon: Search
          })
          break
        case 'leaderboard':
          segments.push({
            label: 'Leaderboard',
            href: isLast ? undefined : href,
            icon: Users
          })
          break
        case 'settings':
          segments.push({
            label: 'Settings',
            href: isLast ? undefined : href,
            icon: Settings
          })
          break
        default:
          // For dynamic segments like IDs, try to get a meaningful name
          if (part.match(/^[0-9a-f-]{36}$/)) {
            // UUID pattern - this is likely a resource or collection ID
            const previousPart = pathParts[i - 1]
            if (previousPart === 'resources') {
              segments.push({
                label: 'Resource Details',
                href: isLast ? undefined : href
              })
            } else if (previousPart === 'collections') {
              segments.push({
                label: 'Collection Details',
                href: isLast ? undefined : href
              })
            } else {
              segments.push({
                label: 'Details',
                href: isLast ? undefined : href
              })
            }
          } else {
            // Capitalize and format the segment
            const label = part
              .split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ')
            
            segments.push({
              label,
              href: isLast ? undefined : href
            })
          }
          break
      }
    }

    return segments
  }

  const segments = generateSegments()

  if (segments.length <= 1) {
    return null // Don't show breadcrumb for home page only
  }

  return (
    <Breadcrumb className={className}>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const isLast = index === segments.length - 1
          const Icon = segment.icon

          return (
            <div key={index} className="flex items-center">
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage className="flex items-center gap-2">
                    {Icon && <Icon className="h-4 w-4" />}
                    {segment.label}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink 
                    href={segment.href || '#'} 
                    className="flex items-center gap-2"
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {segment.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </div>
          )
        })}
      </BreadcrumbList>
    </Breadcrumb>
  )
}

// Specific breadcrumb components for common use cases
export function ResourceBreadcrumb({ 
  resourceTitle, 
  collectionTitle, 
  collectionId 
}: { 
  resourceTitle?: string
  collectionTitle?: string
  collectionId?: string
}) {
  const segments: BreadcrumbSegment[] = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Resources', href: '/resources', icon: FileText }
  ]

  if (collectionTitle && collectionId) {
    segments.push({
      label: collectionTitle,
      href: `/collections/${collectionId}`,
      icon: FolderOpen
    })
  }

  if (resourceTitle) {
    segments.push({
      label: resourceTitle
    })
  }

  return <NavigationBreadcrumb customSegments={segments} />
}

export function CollectionBreadcrumb({ 
  collectionTitle,
  isEditing = false
}: { 
  collectionTitle?: string
  isEditing?: boolean
}) {
  const segments: BreadcrumbSegment[] = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Collections', href: '/collections', icon: FolderOpen }
  ]

  if (collectionTitle) {
    if (isEditing) {
      segments.push({
        label: collectionTitle,
        href: `/collections/${collectionTitle.toLowerCase().replace(/\s+/g, '-')}`
      })
      segments.push({
        label: 'Edit'
      })
    } else {
      segments.push({
        label: collectionTitle
      })
    }
  }

  return <NavigationBreadcrumb customSegments={segments} />
}

export function SearchBreadcrumb({ 
  query,
  filters
}: { 
  query?: string
  filters?: Record<string, any>
}) {
  const segments: BreadcrumbSegment[] = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Search', href: '/search', icon: Search }
  ]

  if (query) {
    segments.push({
      label: `"${query}"`
    })
  } else if (filters && Object.keys(filters).length > 0) {
    segments.push({
      label: 'Filtered Results'
    })
  }

  return <NavigationBreadcrumb customSegments={segments} />
}