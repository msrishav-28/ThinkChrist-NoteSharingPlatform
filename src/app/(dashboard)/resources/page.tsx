'use client'

import { useState, useEffect } from 'react'
import { ResourceCard, ResourceFilters } from '@/features/resources'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Resource } from '@/types'
import { Loader2 } from 'lucide-react'

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filters, setFilters] = useState({
    search: '',
    department: '',
    semester: '',
    sortBy: 'recent',
  })
  const supabase = createClient()

  useEffect(() => {
    fetchResources()
  }, [page, filters])

  const fetchResources = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        sortBy: filters.sortBy,
        ...(filters.search && { search: filters.search }),
        ...(filters.department && { department: filters.department }),
        ...(filters.semester && { semester: filters.semester }),
      })

      const response = await fetch(`/api/resources?${params}`)
      const data = await response.json()

      if (response.ok) {
        setResources(data.resources)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error('Error fetching resources:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters)
    setPage(1) // Reset to first page when filters change
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Resources</h1>
        <p className="text-muted-foreground">
          Browse and download study materials shared by the community
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <ResourceFilters onFilterChange={handleFilterChange} />
        </div>

        <div className="lg:col-span-3">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : resources.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground mb-4">
                No resources found matching your criteria
              </p>
              <Button onClick={() => handleFilterChange({
                search: '',
                department: '',
                semester: '',
                sortBy: 'recent',
              })}>
                Clear Filters
              </Button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                {resources.map((resource) => (
                  <ResourceCard 
                    key={resource.id} 
                    resource={resource}
                    onVote={() => fetchResources()}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="mt-6 flex items-center justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}