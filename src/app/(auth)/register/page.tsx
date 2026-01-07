import { RegisterForm } from '@/features/auth'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <div className="w-full max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold font-heading tracking-tight">Create Account</h1>
        <p className="text-muted-foreground">Join our community of students and researchers</p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline underline-offset-4 decoration-primary/50 hover:decoration-primary transition-all">
          Sign in here
        </Link>
      </p>
    </div>
  )
}