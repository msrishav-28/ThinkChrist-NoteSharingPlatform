'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { useAuth } from '@/features/auth'
import { BookOpen, Trophy, Upload, User, LogOut, Sparkles, LayoutDashboard } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

import { config } from '@/shared/config'
import { cn } from '@/lib/utils'

export function Navbar() {
  const pathname = usePathname()
  const { user, profile, signOut } = useAuth()

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/resources', label: 'Resources', icon: BookOpen },
    { href: '/resources/upload', label: 'Upload', icon: Upload },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ]

  return (
    <nav
      className="sticky top-0 z-50 w-full"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Floating Glass Container */}
      <div className="container mx-auto px-4 py-4">
        <div className="rounded-2xl glass border border-white/20 dark:border-white/10 shadow-lg backdrop-blur-md px-6 h-16 flex items-center justify-between transition-all duration-300">
          <Link
            href="/"
            className="flex items-center space-x-2 focus:outline-none group"
            aria-label={`${config.branding.organizationName} - Go to homepage`}
          >
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-xl font-heading bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">{config.branding.organizationName}</span>
          </Link>

          {user && (
            <div className="flex items-center space-x-2 lg:space-x-6">
              <div className="hidden lg:flex items-center space-x-1" role="menubar" aria-label="Main menu">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? 'secondary' : 'ghost'}
                        size="sm"
                        className={cn(
                          "flex items-center gap-2 rounded-full px-4 transition-all",
                          isActive ? "font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                        aria-current={isActive ? 'page' : undefined}
                        role="menuitem"
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {item.label}
                      </Button>
                    </Link>
                  )
                })}
              </div>

              <div className="h-6 w-px bg-border hidden lg:block" />

              <div className="flex items-center gap-2">
                <ThemeToggle />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 rounded-full pl-2 pr-4 hover:bg-muted/50 transition-colors"
                      aria-label={`User menu for ${profile?.full_name || 'User'}`}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex flex-col items-start text-xs hidden sm:flex">
                        <span className="font-medium">{profile?.full_name?.split(' ')[0]}</span>
                        <span className="text-muted-foreground">{profile?.points || 0} pts</span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 rounded-xl glass p-2">
                    <DropdownMenuLabel className="font-heading">My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild className="rounded-lg focus:bg-primary/10 cursor-pointer">
                      <Link href="/profile" className="flex items-center">
                        <User className="mr-2 h-4 w-4" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => signOut()}
                      className="rounded-lg focus:bg-red-500/10 text-red-600 focus:text-red-600 cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          )}

          {!user && (
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <Link href="/login">
                <Button variant="ghost" className="font-medium hover:bg-primary/5">Sign in</Button>
              </Link>
              <Link href="/register">
                <Button className="rounded-full px-6 shadow-md hover:shadow-lg transition-all hover:scale-105">Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
