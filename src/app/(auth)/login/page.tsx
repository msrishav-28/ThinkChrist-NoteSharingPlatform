import { LoginForm } from '@/features/auth'
import Link from 'next/link'

export default function LoginPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold font-heading tracking-tight">Welcome Back</h1>
        <p className="text-muted-foreground">Enter your credentials to access your account</p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="font-semibold text-primary hover:underline underline-offset-4 decoration-primary/50 hover:decoration-primary transition-all">
          Register here
        </Link>
      </p>
    </div>
  )
}