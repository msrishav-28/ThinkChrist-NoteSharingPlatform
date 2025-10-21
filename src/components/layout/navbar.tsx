'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { useAuth } from '@/features/auth'
import { BookOpen, Trophy, Upload, User, LogOut } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

export function Navbar() {
  const pathname = usePathname()
  const { user, profile, signOut } = useAuth()

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: BookOpen },
    { href: '/resources', label: 'Resources', icon: BookOpen },
    { href: '/resources/upload', label: 'Upload', icon: Upload },
    { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ]

  return (
    <nav 
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="container flex h-16 items-center">
        <Link 
          href="/" 
          className="flex items-center space-x-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md"
          aria-label="Christ UniConnect - Go to homepage"
        >
          <span className="font-bold text-xl text-primary">Christ UniConnect</span>
        </Link>
        
        {user && (
          <div className="ml-auto flex items-center space-x-4">
            <div className="hidden md:flex space-x-4" role="menubar" aria-label="Main menu">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                return (
                  <Link key={item.href} href={item.href}>
                    <Button
                      variant={isActive ? 'secondary' : 'ghost'}
                      size="sm"
                      className="flex items-center gap-2"
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
            
            <ThemeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center gap-2"
                  aria-label={`User menu for ${profile?.full_name || 'User'}. ${profile?.points || 0} points`}
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  <span className="hidden md:inline">{profile?.full_name}</span>
                  <Badge 
                    variant="secondary" 
                    className="ml-2"
                    aria-label={`${profile?.points || 0} points`}
                  >
                    {profile?.points || 0} pts
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => signOut()}
                  className="cursor-pointer text-red-600"
                >
                  <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
        
        {!user && (
          <div className="ml-auto flex items-center space-x-4">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        )}
      </div>
    </nav>
  )
}