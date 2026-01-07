import { config } from '@/shared/config'

export default function Navbar() {
  return (
    <nav className="border-b bg-background">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-primary">{config.branding.organizationName}</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">Navigation</span>
          </div>
        </div>
      </div>
    </nav>
  )
}

export { Navbar }