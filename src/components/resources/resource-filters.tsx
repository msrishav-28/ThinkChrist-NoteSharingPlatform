'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Filter, X } from 'lucide-react'
import { getDepartments } from '@/lib/utils'

interface ResourceFiltersProps {
  onFilterChange: (filters: any) => void
}

export function ResourceFilters({ onFilterChange }: ResourceFiltersProps) {
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [semester, setSemester] = useState('')
  const [sortBy, setSortBy] = useState('recent')

  const handleFilterChange = () => {
    onFilterChange({
      search,
      department,
      semester,
      sortBy,
    })
  }

  const clearFilters = () => {
    setSearch('')
    setDepartment('')
    setSemester('')
    setSortBy('recent')
    onFilterChange({
      search: '',
      department: '',
      semester: '',
      sortBy: 'recent',
    })
  }

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Filter Resources</h3>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyUp={(e) => e.key === 'Enter' && handleFilterChange()}
            className="pl-10"
          />
        </div>
        
        <div className="grid gap-3 md:grid-cols-2">
          <Select
            value={department}
            onValueChange={(value) => {
              setDepartment(value)
              handleFilterChange()
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Departments</SelectItem>
              {getDepartments().map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={semester}
            onValueChange={(value) => {
              setSemester(value)
              handleFilterChange()
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All Semesters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Semesters</SelectItem>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <SelectItem key={sem} value={sem.toString()}>
                  Semester {sem}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <Select
          value={sortBy}
          onValueChange={(value) => {
            setSortBy(value)
            handleFilterChange()
          }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Most Recent</SelectItem>
            <SelectItem value="popular">Most Popular</SelectItem>
            <SelectItem value="downloads">Most Downloaded</SelectItem>
            <SelectItem value="upvotes">Most Upvoted</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="flex gap-2">
          <Button 
            onClick={handleFilterChange}
            className="flex-1"
          >
            Apply Filters
          </Button>
          <Button
            variant="outline"
            onClick={clearFilters}
            size="icon"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}