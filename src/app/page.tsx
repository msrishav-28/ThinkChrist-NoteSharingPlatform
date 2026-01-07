import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BookOpen, Users, Trophy, Upload, Sparkles, Zap, Shield, Globe } from 'lucide-react'
import { config } from '@/shared/config'
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid'
import { FadeIn, SlideUp, WordPullUp, HoverCard } from '@/components/ui/motion-primitives'

export default function HomePage() {
  const features = [
    {
      title: "Smart Resources",
      description: "Access quality notes, papers, and study materials organized by course.",
      header: <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100" />,
      icon: <BookOpen className="h-4 w-4 text-neutral-500" />,
      className: "md:col-span-2",
    },
    {
      title: "Community Driven",
      description: "Learn from peers, share knowledge, and grow together.",
      header: <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100" />,
      icon: <Users className="h-4 w-4 text-neutral-500" />,
      className: "md:col-span-1",
    },
    {
      title: "Earn Recognition",
      description: "Get rewarded for your contributions with points and badges.",
      header: <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100" />,
      icon: <Trophy className="h-4 w-4 text-neutral-500" />,
      className: "md:col-span-1",
    },
    {
      title: "Easy Sharing",
      description: "Upload and share resources with just a few clicks.",
      header: <div className="flex flex-1 w-full h-full min-h-[6rem] rounded-xl bg-gradient-to-br from-neutral-200 dark:from-neutral-900 dark:to-neutral-800 to-neutral-100" />,
      icon: <Upload className="h-4 w-4 text-neutral-500" />,
      className: "md:col-span-2",
    },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden selection:bg-primary selection:text-white">
      {/* Abstract Background Shapes */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
        <div className="absolute top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-secondary/10 blur-[120px] animate-pulse delay-75" />
      </div>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <SlideUp className="flex justify-center mb-6">
            <span className="px-4 py-1.5 rounded-full glass text-sm font-medium text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>v2.0 is here. Experience the future of learning.</span>
            </span>
          </SlideUp>

          <WordPullUp
            className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-800 to-neutral-500 dark:from-neutral-50 dark:to-neutral-400 mb-8"
            words={config.branding.organizationName}
          />

          <FadeIn delay={0.4}>
            <h2 className="text-2xl md:text-3xl font-medium text-secondary mb-6">
              {config.branding.appName}
            </h2>
            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              {config.app.description} - Your collaborative platform for academic success.
              Elevate your grades with the power of community.
            </p>
          </FadeIn>

          <SlideUp delay={0.6} className="flex gap-4 justify-center items-center flex-col sm:flex-row">
            <Link href="/register">
              <Button size="lg" className="rounded-full px-8 py-6 text-lg bg-primary hover:bg-primary/90 text- white shadow-lg shadow-primary/25 transition-all hover:scale-105">
                Get Started <Zap className="ml-2 w-5 h-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="rounded-full px-8 py-6 text-lg border-2 hover:bg-muted/50 transition-all hover:scale-105 glass">
                Sign In
              </Button>
            </Link>
          </SlideUp>
        </div>
      </div>

      {/* Features Bento Grid */}
      <div className="max-w-7xl mx-auto px-6 py-24">
        <FadeIn>
          <h2 className="text-3xl md:text-5xl font-bold text-center mb-16">
            Why <span className="text-primary">{config.branding.organizationName}</span>?
          </h2>
        </FadeIn>

        <BentoGrid>
          {features.map((item, i) => (
            <BentoGridItem
              key={i}
              title={item.title}
              description={item.description}
              header={item.header}
              icon={item.icon}
              className={item.className}
            />
          ))}
        </BentoGrid>
      </div>

      {/* CTA Section */}
      <div className="relative py-24 px-6 mt-12 bg-primary overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-secondary/30 rounded-full blur-3xl" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <SlideUp>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Join the Knowledge Revolution
            </h2>
            <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
              Stop studying alone. Start sharing, learning, and growing with your peers today.
            </p>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="rounded-full px-10 py-7 text-xl font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
                Join Now <Globe className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </SlideUp>
        </div>
      </div>
    </div>
  )
}
