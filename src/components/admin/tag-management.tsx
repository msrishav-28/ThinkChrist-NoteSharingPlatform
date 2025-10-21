'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Merge, 
  MoreHorizontal, 
  Search,
  AlertTriangle,
  CheckCircle,
  X
} from 'lucide-react'
import { useTagAnalytics } from '@/lib/hooks/use-tags'
import { TagManagementService, type TagAnalytics } from '@/lib/services/tag-management'
import { useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils'

interface TagMergeCandidate {
  primary: string
  duplicates: string[]
  confidence: number
}

export function TagManagement() {
  const { analytics, loading, error, fetchAnalytics } = useTagAnalytics()
  const { toast } = useToast()
  
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'usage' | 'trending' | 'alphabetical'>('usage')
  const [mergeCandidates, setMergeCandidates] = useState<TagMergeCandidate[]>([])
  const [loadingMerges, setLoadingMerges] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [mergeTarget, setMergeTarget] = useState('')

  // Fetch merge suggestions
  useEffect(() => {
    const fetchMergeSuggestions = async () => {
      setLoadingMerges(true)
      try {
        const suggestions = await TagManagementService.suggestTagMerges()
        setMergeCandidates(suggestions)
      } catch (err) {
        console.error('Error fetching merge suggestions:', err)
      } finally {
        setLoadingMerges(false)
      }
    }

    if (analytics.length > 0) {
      fetchMergeSuggestions()
    }
  }, [analytics])

  const filteredAnalytics = analytics
    .filter(tag => 
      tag.tag.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'usage':
          return b.usage_count - a.usage_count
        case 'trending':
          return b.trending_score - a.trending_score
        case 'alphabetical':
          return a.tag.localeCompare(b.tag)
        default:
          return 0
      }
    })

  const handleMergeTags = async (primaryTag: string, tagsToMerge: string[]) => {
    try {
      const success = await TagManagementService.mergeTags(primaryTag, tagsToMerge)
      if (success) {
        toast({
          title: 'Tags merged successfully',
          description: `Merged ${tagsToMerge.length} tags into "${primaryTag}"`,
        })
        await fetchAnalytics()
        setMergeCandidates(prev => 
          prev.filter(candidate => candidate.primary !== primaryTag)
        )
      } else {
        throw new Error('Merge failed')
      }
    } catch (error) {
      toast({
        title: 'Error merging tags',
        description: 'Failed to merge tags. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleCustomMerge = async () => {
    if (selectedTags.length < 2 || !mergeTarget) {
      toast({
        title: 'Invalid selection',
        description: 'Please select at least 2 tags and specify a target tag.',
        variant: 'destructive',
      })
      return
    }

    const tagsToMerge = selectedTags.filter(tag => tag !== mergeTarget)
    await handleMergeTags(mergeTarget, tagsToMerge)
    setSelectedTags([])
    setMergeTarget('')
    setMergeDialogOpen(false)
  }

  const getTagTrendIcon = (trendingScore: number) => {
    if (trendingScore > 0.5) return <TrendingUp className="h-3 w-3 text-green-500" />
    if (trendingScore > 0.3) return <TrendingUp className="h-3 w-3 text-yellow-500" />
    return null
  }

  const getUsageColor = (usage: number, maxUsage: number) => {
    const ratio = usage / maxUsage
    if (ratio > 0.8) return 'bg-green-500'
    if (ratio > 0.6) return 'bg-blue-500'
    if (ratio > 0.4) return 'bg-yellow-500'
    return 'bg-gray-500'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">{error}</p>
            <Button onClick={fetchAnalytics} className="mt-4">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const maxUsage = Math.max(...analytics.map(tag => tag.usage_count))
  const totalTags = analytics.length
  const trendingTags = analytics.filter(tag => tag.trending_score > 0.3).length
  const totalUsage = analytics.reduce((sum, tag) => sum + tag.usage_count, 0)

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tags</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTags}</div>
            <p className="text-xs text-muted-foreground">
              Across all resources
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trending Tags</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trendingTags}</div>
            <p className="text-xs text-muted-foreground">
              Recently popular
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsage}</div>
            <p className="text-xs text-muted-foreground">
              Tag applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Merge Candidates</CardTitle>
            <Merge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mergeCandidates.length}</div>
            <p className="text-xs text-muted-foreground">
              Suggested merges
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Merge Suggestions */}
      {mergeCandidates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5" />
              Suggested Tag Merges
            </CardTitle>
            <CardDescription>
              Similar tags that could be merged to reduce duplication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mergeCandidates.slice(0, 5).map((candidate, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="default">{candidate.primary}</Badge>
                      <span className="text-sm text-muted-foreground">←</span>
                      <div className="flex gap-1">
                        {candidate.duplicates.map(dup => (
                          <Badge key={dup} variant="secondary">{dup}</Badge>
                        ))}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Confidence: {Math.round(candidate.confidence * 100)}%
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleMergeTags(candidate.primary, candidate.duplicates)}
                  >
                    <Merge className="h-3 w-3 mr-1" />
                    Merge
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tag Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tag Analytics</CardTitle>
              <CardDescription>
                Manage and analyze tag usage across the platform
              </CardDescription>
            </div>
            
            <Dialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Merge className="h-4 w-4 mr-2" />
                  Custom Merge
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Merge Selected Tags</DialogTitle>
                  <DialogDescription>
                    Select tags to merge and specify the target tag name
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Selected Tags:</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedTags.map(tag => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Target Tag Name:</label>
                    <Input
                      value={mergeTarget}
                      onChange={(e) => setMergeTarget(e.target.value)}
                      placeholder="Enter the final tag name"
                      className="mt-2"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setMergeDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCustomMerge}>
                    Merge Tags
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  Sort by: {sortBy}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy('usage')}>
                  Usage Count
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('trending')}>
                  Trending Score
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy('alphabetical')}>
                  Alphabetical
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Tag List */}
          <div className="space-y-2">
            {filteredAnalytics.map((tag) => (
              <div
                key={tag.tag}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedTags.includes(tag.tag)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTags(prev => [...prev, tag.tag])
                      } else {
                        setSelectedTags(prev => prev.filter(t => t !== tag.tag))
                      }
                    }}
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{tag.tag}</Badge>
                      {getTagTrendIcon(tag.trending_score)}
                    </div>
                    
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>Used {tag.usage_count} times</span>
                      <span>Recent: {tag.recent_usage}</span>
                      <span>Departments: {tag.departments.length}</span>
                      <span>Courses: {tag.courses.length}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Usage bar */}
                  <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all",
                        getUsageColor(tag.usage_count, maxUsage)
                      )}
                      style={{
                        width: `${(tag.usage_count / maxUsage) * 100}%`
                      }}
                    />
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedTags([tag.tag])
                          setMergeTarget(tag.tag)
                          setMergeDialogOpen(true)
                        }}
                      >
                        <Merge className="h-4 w-4 mr-2" />
                        Merge with others
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>

          {filteredAnalytics.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No tags found matching your search.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}