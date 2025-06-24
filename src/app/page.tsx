import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { BookOpen, Users, Trophy, Upload } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-950">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-primary dark:text-white mb-6">
              Christ UniConnect
            </h1>
            <p className="text-2xl text-secondary font-semibold mb-4">
              Knowledge Hub & Innovation Forge
            </p>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Learn Together, Grow Together - Your collaborative platform for academic success
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-primary hover:bg-primary-700">
                  Get Started
                </Button>
              </Link>
              <Link href="/login">
                <Button size="lg" variant="outline">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why Christ UniConnect?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <BookOpen className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Smart Resources</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Access quality notes, papers, and study materials organized by course
            </p>
          </Card>
          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <Users className="w-12 h-12 text-secondary mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Community Driven</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Learn from peers, share knowledge, and grow together
            </p>
          </Card>
          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <Trophy className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Earn Recognition</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Get rewarded for your contributions with points and badges
            </p>
          </Card>
          <Card className="p-6 text-center hover:shadow-lg transition-shadow">
            <Upload className="w-12 h-12 text-secondary mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Easy Sharing</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Upload and share resources with just a few clicks
            </p>
          </Card>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-white py-16">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl font-bold mb-4">
            Join the Christ University Knowledge Community
          </h2>
          <p className="text-xl mb-8">
            Start sharing, learning, and growing with your peers today
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-secondary text-primary hover:bg-secondary-600">
              Join Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}