'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { 
  Filter, 
  X, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Video, 
  Link, 
  Code, 
  BookOpen,
  Calendar,
  Tag,
  Building,
  GraduationCap
} from 'lucide-react'
import type { SearchFilters } from '@/types'
import { cn } from '@/lib/utils'

interface SearchFiltersProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  facets?: {
    resourceTypes: Record<string, number>
    departments: Record<string, number>
    courses: Record<string, number>
    tags: Record<string, number>
    difficulty: Record<string, number>
  }
  className?: string
}

interface FilterSection {
  key: keyof SearchFilters
  title: string
  icon: React.ReactNode
  isOpen: boolean
}

export function SearchFilters({ 
  filters, 
  onFiltersChange, 
  facets = {
    resourceTypes: {},
    departments: {},
    courses: {},
    tags: {},
    difficulty: {}
  },
  className 
}: SearchFiltersProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    resourceTypes: true,
    departments: false,
    courses: false,
    tags: false,
    difficulty: false,
    dateRange: false
  })

  const [customDateRange, setCustomDateRange] = useState({
    start: filters.dateRange?.start || '',
    end: filters.dateRange?.end || ''
  })

  // Resource type options with icons
  const resourceTypeOptions = [
    { value: 'document' as const, label: 'Documents', icon: <FileText className="h-4 w-4" /> },
    { value: 'video' as const, label: 'Videos', icon: <Video className="h-4 w-4" /> },
    { value: 'link' as const, label: 'Links', icon: <Link className="h-4 w-4" /> },
    { value: 'code' as const, label: 'Code', icon: <Code className="h-4 w-4" /> },
    { value: 'article' as const, label: 'Articles', icon: <BookOpen className="h-4 w-4" /> }
  ]

  // Difficulty options
  const difficultyOptions = [
    { value: 'beginner' as const, label: 'Beginner', color: 'bg-green-100 text-green-800' },
    { value: 'intermediate' as const, label: 'Intermediate', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'advanced' as const, label: 'Advanced', color: 'bg-red-100 text-red-800' }
  ]

  // Update filters helper
  const updateFilters = (key: keyof SearchFilters, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    })
  }

  // Toggle filter value in array
  const toggleArrayFilter = (key: keyof SearchFilters, value: string) => {
    const currentArray = (filters[key] as string[]) || []
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value]
    
    updateFilters(key, newArray.length > 0 ? newArray : undefined)
  }

  // Toggle section open/closed
  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Clear all filters
  const clearAllFilters = () => {
    onFiltersChange({})
    setCustomDateRange({ start: '', end: '' })
  }

  // Apply date range
  const applyDateRange = () => {
    if (customDateRange.start && customDateRange.end) {
      updateFilters('dateRange', customDateRange)
    } else {
      updateFilters('dateRange', undefined)
    }
  }

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0
    if (filters.resourceTypes?.length) count += filters.resourceTypes.length
    if (filters.departments?.length) count += filters.departments.length
    if (filters.courses?.length) count += filters.courses.length
    if (filters.tags?.length) count += filters.tags.length
    if (filters.difficulty?.length) count += filters.difficulty.length
    if (filters.dateRange) count += 1
    return count
  }

  const activeFilterCount = getActiveFilterCount()

  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold">Filters</h3>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          {activeFilterCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-8 px-2 text-xs"
            >
              Clear all
            </Button>
          )}
        </div>

        {/* Resource Types */}
        <Collapsible
          open={openSections.resourceTypes}
          onOpenChange={() => toggleSection('resourceTypes')}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto font-medium"
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Resource Types
                {filters.resourceTypes?.length && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.resourceTypes.length}
                  </Badge>
                )}
              </div>
              {openSections.resourceTypes ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {resourceTypeOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${option.value}`}
                  checked={filters.resourceTypes?.includes(option.value) || false}
                  onCheckedChange={() => toggleArrayFilter('resourceTypes', option.value)}
                />
                <Label
                  htmlFor={`type-${option.value}`}
                  className="flex items-center gap-2 text-sm font-normal cursor-pointer"
                >
                  {option.icon}
                  {option.label}
                  {facets.resourceTypes?.[option.value] && (
                    <span className="text-xs text-muted-foreground">
                      ({facets.resourceTypes[option.value]})
                    </span>
                  )}
                </Label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Departments */}
        <Collapsible
          open={openSections.departments}
          onOpenChange={() => toggleSection('departments')}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto font-medium"
            >
              <div className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Departments
                {filters.departments?.length && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.departments.length}
                  </Badge>
                )}
              </div>
              {openSections.departments ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {Object.entries(facets.departments || {})
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([dept, count]) => (
                <div key={dept} className="flex items-center space-x-2">
                  <Checkbox
                    id={`dept-${dept}`}
                    checked={filters.departments?.includes(dept) || false}
                    onCheckedChange={() => toggleArrayFilter('departments', dept)}
                  />
                  <Label
                    htmlFor={`dept-${dept}`}
                    className="flex items-center justify-between w-full text-sm font-normal cursor-pointer"
                  >
                    <span>{dept}</span>
                    <span className="text-xs text-muted-foreground">({count})</span>
                  </Label>
                </div>
              ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Courses */}
        <Collapsible
          open={openSections.courses}
          onOpenChange={() => toggleSection('courses')}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto font-medium"
            >
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Courses
                {filters.courses?.length && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.courses.length}
                  </Badge>
                )}
              </div>
              {openSections.courses ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {Object.entries(facets.courses || {})
              .sort(([, a], [, b]) => b - a)
              .slice(0, 10)
              .map(([course, count]) => (
                <div key={course} className="flex items-center space-x-2">
                  <Checkbox
                    id={`course-${course}`}
                    checked={filters.courses?.includes(course) || false}
                    onCheckedChange={() => toggleArrayFilter('courses', course)}
                  />
                  <Label
                    htmlFor={`course-${course}`}
                    className="flex items-center justify-between w-full text-sm font-normal cursor-pointer"
                  >
                    <span>{course}</span>
                    <span className="text-xs text-muted-foreground">({count})</span>
                  </Label>
                </div>
              ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Tags */}
        <Collapsible
          open={openSections.tags}
          onOpenChange={() => toggleSection('tags')}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto font-medium"
            >
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
                {filters.tags?.length && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.tags.length}
                  </Badge>
                )}
              </div>
              {openSections.tags ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {Object.entries(facets.tags || {})
              .sort(([, a], [, b]) => b - a)
              .slice(0, 15)
              .map(([tag, count]) => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={`tag-${tag}`}
                    checked={filters.tags?.includes(tag) || false}
                    onCheckedChange={() => toggleArrayFilter('tags', tag)}
                  />
                  <Label
                    htmlFor={`tag-${tag}`}
                    className="flex items-center justify-between w-full text-sm font-normal cursor-pointer"
                  >
                    <span>{tag}</span>
                    <span className="text-xs text-muted-foreground">({count})</span>
                  </Label>
                </div>
              ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Difficulty */}
        <Collapsible
          open={openSections.difficulty}
          onOpenChange={() => toggleSection('difficulty')}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto font-medium"
            >
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Difficulty
                {filters.difficulty?.length && (
                  <Badge variant="secondary" className="text-xs">
                    {filters.difficulty.length}
                  </Badge>
                )}
              </div>
              {openSections.difficulty ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-2 mt-2">
            {difficultyOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`difficulty-${option.value}`}
                  checked={filters.difficulty?.includes(option.value) || false}
                  onCheckedChange={() => toggleArrayFilter('difficulty', option.value)}
                />
                <Label
                  htmlFor={`difficulty-${option.value}`}
                  className="flex items-center justify-between w-full text-sm font-normal cursor-pointer"
                >
                  <Badge className={option.color} variant="secondary">
                    {option.label}
                  </Badge>
                  {facets.difficulty?.[option.value] && (
                    <span className="text-xs text-muted-foreground">
                      ({facets.difficulty[option.value]})
                    </span>
                  )}
                </Label>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>

        {/* Date Range */}
        <Collapsible
          open={openSections.dateRange}
          onOpenChange={() => toggleSection('dateRange')}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="w-full justify-between p-0 h-auto font-medium"
            >
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Date Range
                {filters.dateRange && (
                  <Badge variant="secondary" className="text-xs">
                    Custom
                  </Badge>
                )}
              </div>
              {openSections.dateRange ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-2">
            <div className="space-y-2">
              <Label htmlFor="date-start" className="text-xs">From</Label>
              <Input
                id="date-start"
                type="date"
                value={customDateRange.start}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date-end" className="text-xs">To</Label>
              <Input
                id="date-end"
                type="date"
                value={customDateRange.end}
                onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="text-sm"
              />
            </div>
            <Button
              size="sm"
              onClick={applyDateRange}
              className="w-full"
              disabled={!customDateRange.start || !customDateRange.end}
            >
              Apply Date Range
            </Button>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </Card>
  )
}