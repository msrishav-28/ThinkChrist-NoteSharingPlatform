import { Navbar } from '@/components/layout/navbar'
import { AuthGuard } from '@/features/auth'
import { NavigationBreadcrumb } from '@/components/common/navigation-breadcrumb'
import { KeyboardShortcutsProvider } from '@/components/providers/keyboard-shortcuts-provider'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard>
      <KeyboardShortcutsProvider>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="container mx-auto">
            {/* Breadcrumb Navigation */}
            <div className="py-4 border-b">
              <NavigationBreadcrumb />
            </div>
            <main className="py-6">
              {children}
            </main>
          </div>
        </div>
      </KeyboardShortcutsProvider>
    </AuthGuard>
  )
}