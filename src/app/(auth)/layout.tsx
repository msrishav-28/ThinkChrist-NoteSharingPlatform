import { config } from '@/shared/config'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left: Decorative/Marketing Side */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 overflow-hidden bg-zinc-900 border-r border-white/10">
        {/* Animated Background */}
        <div className="absolute inset-0 w-full h-full">
          <div className="absolute top-0 -left-1/4 w-full h-full bg-primary/20 blur-[150px] animate-pulse duration-[10000ms]" />
          <div className="absolute bottom-0 -right-1/4 w-full h-full bg-secondary/20 blur-[150px] animate-pulse duration-[7000ms]" />
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-20" />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold font-heading text-white">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            {config.branding.organizationName}
          </Link>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <h1 className="text-5xl font-bold font-heading text-white leading-tight">
            Elevate your academic journey together.
          </h1>
          <p className="text-xl text-zinc-400">
            Join thousands of students sharing knowledge, resources, and success stories.
            The future of learning is collaborative.
          </p>
        </div>

        <div className="relative z-10 text-sm text-zinc-500">
          © {new Date().getFullYear()} {config.branding.organizationName}. All rights reserved.
        </div>
      </div>

      {/* Right: Form Side */}
      <div className="flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-background">
        {/* Subtle Mobile Background */}
        <div className="absolute inset-0 lg:hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/20 blur-[100px]" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-secondary/20 blur-[100px]" />
        </div>

        <div className="w-full max-w-md space-y-8 relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {children}
        </div>
      </div>
    </div>
  )
}
