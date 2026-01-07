'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/lib/hooks/use-toast'
import { validateInstitutionEmail, getDepartments } from '../utils'

import { config } from '@/shared/config'

const registerSchema = z.object({
  email: z.string().email('Invalid email').refine((email) => validateInstitutionEmail(email), {
    message: `Please use your ${config.branding.organizationName} email`,
  }),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  department: z.string().min(1, 'Please select a department'),
  semester: z.string().min(1, 'Please select a semester'),
  tracking_consent: z.boolean().default(false),
})

type RegisterFormData = z.infer<typeof registerSchema>

export function RegisterForm() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      full_name: '',
      department: '',
      semester: '',
      tracking_consent: false,
    },
  })

  const onSubmit = async (data: RegisterFormData) => {
    setLoading(true)

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })

      if (authError) {
        toast({
          title: 'Error',
          description: authError.message,
          variant: 'destructive',
        })
        return
      }

      // Create user profile
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: data.email,
            full_name: data.full_name,
            department: data.department,
            semester: parseInt(data.semester),
            tracking_consent: data.tracking_consent,
          })

        if (profileError) {
          toast({
            title: 'Error',
            description: 'Failed to create profile. Please try again.',
            variant: 'destructive',
          })
          return
        }

        toast({
          title: 'Success',
          description: 'Account created successfully! Please check your email to verify.',
        })
        router.push('/login')
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
        <CardDescription>
          Join the {config.branding.organizationName} community
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Full Name"
              {...form.register('full_name')}
              disabled={loading}
            />
            {form.formState.errors.full_name && (
              <p className="text-sm text-red-500">{form.formState.errors.full_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Input
              type="email"
              placeholder={config.branding.auth.emailPlaceholder}
              {...form.register('email')}
              disabled={loading}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Select
              value={form.watch('department')}
              onValueChange={(value) => form.setValue('department', value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Department" />
              </SelectTrigger>
              <SelectContent>
                {getDepartments().map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.department && (
              <p className="text-sm text-red-500">{form.formState.errors.department.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Select
              value={form.watch('semester')}
              onValueChange={(value) => form.setValue('semester', value)}
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Semester" />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <SelectItem key={sem} value={sem.toString()}>
                    Semester {sem}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.semester && (
              <p className="text-sm text-red-500">{form.formState.errors.semester.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Input
              type="password"
              placeholder="Password"
              {...form.register('password')}
              disabled={loading}
            />
            {form.formState.errors.password && (
              <p className="text-sm text-red-500">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="flex items-start space-x-3 py-2">
            <Checkbox
              id="tracking_consent"
              checked={form.watch('tracking_consent')}
              onCheckedChange={(checked) => form.setValue('tracking_consent', checked === true)}
              disabled={loading}
            />
            <label
              htmlFor="tracking_consent"
              className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
            >
              Help us improve by sharing basic usage data like device type and general location
            </label>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}