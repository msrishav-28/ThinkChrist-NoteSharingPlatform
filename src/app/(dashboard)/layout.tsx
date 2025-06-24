import { Navbar } from '@/components/layout/navbar'
import { AuthGuard } from '@/components/auth/auth-guard'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto py-6">
          {children}
        </main>
      </div>
    </AuthGuard>
  )
}