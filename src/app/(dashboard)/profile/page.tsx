// src/app/(dashboard)/profile/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/features/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/lib/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { getDepartments } from '@/features/auth/utils'
import { User, Trophy, BookOpen, Download, ThumbsUp, Wallet, Sparkles, Edit2, Check, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'
import { cn } from '@/lib/utils'

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
      'Master': 'bg-purple-500/20 text-purple-600 border-purple-200',
      'Expert': 'bg-blue-500/20 text-blue-600 border-blue-200',
      'Advanced': 'bg-green-500/20 text-green-600 border-green-200',
      'Intermediate': 'bg-yellow-500/20 text-yellow-600 border-yellow-200',
      'Freshman': 'bg-zinc-500/20 text-zinc-600 border-zinc-200',
    }
    return colors[level] || 'bg-zinc-500/20 text-zinc-600 border-zinc-200'
  }

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-1">
      {/* Premium Profile Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 to-slate-800 p-8 sm:p-12 text-white shadow-2xl"
      >
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20 mix-blend-overlay" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 animate-pulse" />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-white/10 bg-white/5 backdrop-blur-md flex items-center justify-center shadow-2xl relative overflow-hidden group">
              <User className="w-12 h-12 text-white/50 group-hover:scale-110 transition-transform duration-500" />
              {/* Shiny effect */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            </div>
            <Badge className="absolute -bottom-2 -right-2 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 border-0 text-white font-bold shadow-lg">
              {profile.badge_level}
            </Badge>
          </div>

          <div className="flex-1 text-center md:text-left space-y-4 w-full">
            {!editing ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center md:justify-start gap-4">
                  <h1 className="text-4xl font-bold font-heading">{profile.full_name}</h1>
                  <Button variant="ghost" size="icon" className="text-white/50 hover:text-white hover:bg-white/10 rounded-full" onClick={() => setEditing(true)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-slate-300 font-medium text-lg">{profile.email}</p>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                  <Badge variant="outline" className="text-slate-200 border-white/20 px-3 py-1 text-sm bg-white/5">
                    {profile.department}
                  </Badge>
                  <Badge variant="outline" className="text-slate-200 border-white/20 px-3 py-1 text-sm bg-white/5">
                    Semester {profile.semester}
                  </Badge>
                  <Badge variant="outline" className="text-slate-200 border-white/20 px-3 py-1 text-sm bg-white/5">
                    Member since {new Date(profile.created_at).getFullYear()}
                  </Badge>
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 max-w-2xl"
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Full Name</label>
                    <Input
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="bg-black/20 border-white/10 text-white placeholder:text-white/30"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Department</label>
                    <Select
                      value={formData.department}
                      onValueChange={(value) => setFormData({ ...formData, department: value })}
                    >
                      <SelectTrigger className="bg-black/20 border-white/10 text-white">
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
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Semester</label>
                    <Select
                      value={formData.semester}
                      onValueChange={(value) => setFormData({ ...formData, semester: value })}
                    >
                      <SelectTrigger className="bg-black/20 border-white/10 text-white">
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
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button variant="ghost" onClick={() => setEditing(false)} className="text-white hover:bg-white/10">
                    Cancel
                  </Button>
                  <Button onClick={handleUpdate} disabled={loading} className="bg-primary hover:bg-primary/90 text-white">
                    {loading ? <Sparkles className="h-4 w-4 animate-spin mr-2" /> : <Check className="h-4 w-4 mr-2" />}
                    Save Changes
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <BentoGrid>
        <BentoGridItem
          title="Total Uploads"
          description="Resources credited to you"
          header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-blue-500/10 to-transparent items-center justify-center"><BookOpen className="w-10 h-10 text-blue-500" /></div>}
          icon={<BookOpen className="h-4 w-4 text-neutral-500" />}
          className="md:col-span-1"
        >
          <div className="text-3xl font-bold font-heading mt-2">{stats.totalUploads}</div>
        </BentoGridItem>

        <BentoGridItem
          title="Total Downloads"
          description="Impact on community"
          header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-green-500/10 to-transparent items-center justify-center"><Download className="w-10 h-10 text-green-500" /></div>}
          icon={<Download className="h-4 w-4 text-neutral-500" />}
          className="md:col-span-1"
        >
          <div className="text-3xl font-bold font-heading mt-2">{stats.totalDownloads}</div>
        </BentoGridItem>

        <BentoGridItem
          title="Reputation"
          description="Upvotes received"
          header={<div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-purple-500/10 to-transparent items-center justify-center"><ThumbsUp className="w-10 h-10 text-purple-500" /></div>}
          icon={<ThumbsUp className="h-4 w-4 text-neutral-500" />}
          className="md:col-span-1"
        >
          <div className="text-3xl font-bold font-heading mt-2">{stats.totalUpvotes}</div>
        </BentoGridItem>

        <BentoGridItem
          title="Points Breakdown"
          description="Your earnings history"
          className="md:col-span-3"
          header={
            <div className="p-4 grid md:grid-cols-3 gap-6">
              <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-xl border border-border/50">
                <div className="p-3 bg-primary/10 rounded-full h-12 w-12 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Uploads</p>
                  <p className="text-2xl font-bold">{stats.totalUploads * 10} pts</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-xl border border-border/50">
                <div className="p-3 bg-primary/10 rounded-full h-12 w-12 flex items-center justify-center">
                  <ThumbsUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Votes</p>
                  <p className="text-2xl font-bold">-</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-xl border border-primary/20">
                <div className="p-3 bg-primary rounded-full h-12 w-12 flex items-center justify-center text-white shadow-lg">
                  <Trophy className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-primary">Total Points</p>
                  <p className="text-3xl font-bold text-primary">{profile.points}</p>
                </div>
              </div>
            </div>
          }
        />
      </BentoGrid>
    </div>
  )
}
