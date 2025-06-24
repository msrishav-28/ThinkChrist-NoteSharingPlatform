// src/app/(dashboard)/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/lib/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { getDepartments } from '@/lib/utils'
import { User, Trophy, BookOpen, Download, ThumbsUp } from 'lucide-react'

export default function ProfilePage() {
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [stats, setStats] = useState({
    totalUploads: 0,
    totalDownloads: 0,
    totalUpvotes: 0,
  })
  const [formData, setFormData] = useState({
    full_name: '',
    department: '',
    semester: '',
  })
  const supabase = createClient()

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name,
        department: profile.department,
        semester: profile.semester.toString(),
      })
      fetchStats()
    }
  }, [profile])

  const fetchStats = async () => {
    if (!user) return

    try {
      // Fetch total uploads
      const { count: uploadsCount } = await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('uploaded_by', user.id)

      // Fetch total downloads
      const { data: resources } = await supabase
        .from('resources')
        .select('downloads')
        .eq('uploaded_by', user.id)

      const totalDownloads = resources?.reduce((sum, r) => sum + r.downloads, 0) || 0

      // Fetch total upvotes
      const { data: resourceIds } = await supabase
        .from('resources')
        .select('id')
        .eq('uploaded_by', user.id)

      const ids = resourceIds?.map(r => r.id) || []
      
      const { count: upvotesCount } = await supabase
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .in('resource_id', ids)
        .eq('vote_type', 'upvote')

      setStats({
        totalUploads: uploadsCount || 0,
        totalDownloads,
        totalUpvotes: upvotesCount || 0,
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleUpdate = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          department: formData.department,
          semester: parseInt(formData.semester),
        })
        .eq('id', user.id)

      if (error) throw error

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      })
      setEditing(false)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update profile',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getBadgeColor = (level: string) => {
    const colors: Record<string, string> = {
      'Master': 'bg-purple-500',
      'Expert': 'bg-blue-500',
      'Advanced': 'bg-green-500',
      'Intermediate': 'bg-yellow-500',
      'Freshman': 'bg-gray-500',
    }
    return colors[level] || 'bg-gray-500'
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your account settings and view your statistics
        </p>
      </div>

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Update your personal details
              </CardDescription>
            </div>
            {!editing && (
              <Button onClick={() => setEditing(true)}>
                Edit Profile
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{profile.full_name}</h3>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
              <Badge className={`${getBadgeColor(profile.badge_level)} text-white ml-auto`}>
                {profile.badge_level}
              </Badge>
            </div>

            {editing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Full Name</label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Department</label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getDepartments().map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Semester</label>
                  <Select
                    value={formData.semester}
                    onValueChange={(value) => setFormData({ ...formData, semester: value })}
                    disabled={loading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                        <SelectItem key={sem} value={sem.toString()}>
                          Semester {sem}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdate} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Changes'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditing(false)
                      setFormData({
                        full_name: profile.full_name,
                        department: profile.department,
                        semester: profile.semester.toString(),
                      })
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{profile.department}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Semester</p>
                  <p className="font-medium">Semester {profile.semester}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Points</p>
                  <p className="font-medium">{profile.points}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">
                    {new Date(profile.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Uploads</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUploads}</div>
            <p className="text-xs text-muted-foreground">
              Resources shared
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDownloads}</div>
            <p className="text-xs text-muted-foreground">
              Times your resources were downloaded
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Upvotes</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUpvotes}</div>
            <p className="text-xs text-muted-foreground">
              Upvotes received
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Points Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Points Breakdown</CardTitle>
          <CardDescription>
            How you earned your points
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
              <div>
                <p className="font-medium">Uploads</p>
                <p className="text-sm text-muted-foreground">10 points per upload</p>
              </div>
              <p className="font-bold">{stats.totalUploads * 10} pts</p>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
              <div>
                <p className="font-medium">Votes Given</p>
                <p className="text-sm text-muted-foreground">1 point per vote</p>
              </div>
              <p className="font-bold">-</p>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted">
              <div>
                <p className="font-medium">Total Points</p>
                <p className="text-sm text-muted-foreground">All time earnings</p>
              </div>
              <p className="font-bold text-primary">{profile.points} pts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
