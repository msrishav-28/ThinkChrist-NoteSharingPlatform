'use client'

import { useState, useEffect } from 'react'
import { ResourceCard, ResourceFilters } from '@/features/resources'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Resource } from '@/types'
import { Loader2, BookOpen, Sparkles, Plus, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input } from '@/components/ui/input'
import Link from 'next/link'

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

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="space-y-8 p-1">
      {/* Premium Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 p-8 sm:p-12 text-white shadow-2xl"
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 mix-blend-overlay" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-bold font-heading tracking-tight flex items-center gap-3">
              <BookOpen className="h-10 w-10 text-white/90" />
              Resource Library
            </h1>
            <p className="text-lg text-indigo-100">
              Access thousands of peer-reviewed notes, assignments, and study materials.
              Elevate your learning with community-driven knowledge.
            </p>
          </div>
          <Link href="/resources/upload">
            <Button size="lg" className="bg-white text-indigo-600 hover:bg-white/90 shadow-xl border-0 font-semibold group rounded-full px-8">
              <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform" />
              Share Resource
            </Button>
          </Link>
        </div>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-4">
        {/* Filters Sidebar - Sticky */}
        <div className="lg:col-span-1 space-y-6">
          <div className="lg:sticky lg:top-24">
            <ResourceFilters onFilterChange={handleFilterChange} />
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3 space-y-6">
          {/* Search Bar (Mobile/Tablet prominent) */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search resources..."
              className="pl-10 h-12 rounded-xl text-lg glass"
              value={filters.search}
              onChange={(e) => handleFilterChange({ ...filters, search: e.target.value })}
            />
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-64 rounded-xl skeleton animate-pulse bg-muted" />
              ))}
            </div>
          ) : resources.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-20 rounded-3xl glass border border-dashed"
            >
              <div className="bg-muted/50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-bold mb-2">No resources found</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                We couldn't find any resources matching your criteria. Try adjusting your filters or search terms.
              </p>
              <Button
                onClick={() => handleFilterChange({
                  search: '',
                  department: '',
                  semester: '',
                  sortBy: 'recent',
                })}
                variant="outline"
                size="lg"
              >
                Clear All Filters
              </Button>
            </motion.div>
          ) : (
            <>
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid gap-6 md:grid-cols-2"
              >
                <AnimatePresence mode="popLayout">
                  {resources.map((resource) => (
                    <motion.div key={resource.id} variants={item} layout>
                      <ResourceCard
                        resource={resource}
                        onVote={() => fetchResources()}
                        className="h-full"
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>

              {totalPages > 1 && (
                <div className="flex justify-center pt-8">
                  <div className="flex items-center gap-2 p-2 rounded-full glass border">
                    <Button
                      variant="ghost"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      className="rounded-full"
                    >
                      Previous
                    </Button>
                    <span className="text-sm font-medium px-4">
                      Page {page} of {totalPages}
                    </span>
                    <Button
                      variant="ghost"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                      className="rounded-full"
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}