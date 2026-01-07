'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, Download, ThumbsUp, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/features/auth'
import { motion, useSpring, useTransform } from 'framer-motion'
import { cn } from '@/lib/utils'

function AnimatedNumber({ value }: { value: number }) {
  const spring = useSpring(0, { mass: 0.8, stiffness: 75, damping: 15 })
  const display = useTransform(spring, (current) => Math.round(current).toLocaleString())

  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  return <motion.span>{display}</motion.span>
}

export function StatsCard() {
  const { user, profile } = useAuth()
  const [stats, setStats] = useState({
    uploads: 0,
    downloads: 0,
    upvotes: 0,
    points: 0
  })
  const supabase = createClient()

  useEffect(() => {
    if (!user) return

    const fetchStats = async () => {
      try {
        const { count: uploads } = await supabase
          .from('resources')
          .select('*', { count: 'exact', head: true })
          .eq('uploaded_by', user.id)

        const { data: resources } = await supabase
          .from('resources')
          .select('downloads')
          .eq('uploaded_by', user.id)

        const totalDownloads = resources?.reduce((sum, r) => sum + r.downloads, 0) || 0

        const { data: upvoteData } = await supabase
          .from('resources')
          .select('upvotes')
          .eq('uploaded_by', user.id)

        const totalUpvotes = upvoteData?.reduce((sum, r) => sum + r.upvotes, 0) || 0

        setStats({
          uploads: uploads || 0,
          downloads: totalDownloads,
          upvotes: totalUpvotes,
          points: profile?.points || 0
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    }

    fetchStats()
  }, [user, profile, supabase])

  const statCards = [
    {
      title: 'Uploads',
      value: stats.uploads,
      icon: Upload,
      description: 'Resources shared',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      border: 'group-hover:border-blue-500/50'
    },
    {
      title: 'Downloads',
      value: stats.downloads,
      icon: Download,
      description: 'Total downloads',
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      border: 'group-hover:border-green-500/50'
    },
    {
      title: 'Upvotes',
      value: stats.upvotes,
      icon: ThumbsUp,
      description: 'Community appreciation',
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
      border: 'group-hover:border-purple-500/50'
    },
    {
      title: 'Points',
      value: stats.points,
      icon: Trophy,
      description: 'Total points earned',
      color: 'text-amber-500',
      bg: 'bg-amber-500/10',
      border: 'group-hover:border-amber-500/50'
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, i) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1, type: "spring", stiffness: 100 }}
        >
          <Card className={cn(
            "relative overflow-hidden transition-colors border-white/5 bg-white/5 backdrop-blur-sm group hover:bg-white/10",
            stat.border
          )}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between space-x-4">
                <div className="flex flex-col space-y-1">
                  <span className="text-sm font-medium text-muted-foreground">{stat.title}</span>
                  <span className="text-3xl font-bold font-heading">
                    <AnimatedNumber value={stat.value} />
                  </span>
                </div>
                <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110 duration-300", stat.bg)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
              </div>
              <div className="mt-4 flex items-center text-xs text-muted-foreground">
                <span className="line-clamp-1">{stat.description}</span>
              </div>
              {/* Background Glow */}
              <div className={cn(
                "absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-[50px] opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none",
                stat.bg.replace('/10', '')
              )} />
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
