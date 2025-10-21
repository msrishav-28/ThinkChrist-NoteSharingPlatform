export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-950">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Loading ThinkChrist...</p>
        <p className="mt-2 text-sm text-muted-foreground/70">Please wait while we prepare your content</p>
      </div>
    </div>
  )
}