# Deployment Guide

## Vercel Deployment for ThinkChrist Note Sharing Platform

This guide provides comprehensive instructions for deploying the ThinkChrist Note Sharing Platform to Vercel with optimal configuration and performance.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Vercel Configuration](#vercel-configuration)
4. [Environment Variables](#environment-variables)
5. [Deployment Process](#deployment-process)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Custom Domain Setup](#custom-domain-setup)
8. [Performance Optimization](#performance-optimization)
9. [Monitoring and Analytics](#monitoring-and-analytics)
10. [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying, ensure you have:

- [x] GitHub repository with your code
- [x] Vercel account ([sign up here](https://vercel.com))
- [x] Supabase project with database and storage configured
- [x] All environment variables ready
- [x] Code tested locally and building successfully

## Pre-Deployment Checklist

### 1. Code Quality Checks

```bash
# Run these commands to ensure your code is deployment-ready
npm run build          # Verify build succeeds
npm run lint           # Check for linting errors
npm run type-check     # Verify TypeScript types (if available)
```

### 2. Environment Configuration

Ensure all required environment variables are documented and ready:

```bash
# Required variables
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
```

### 3. Database Setup

Verify your Supabase setup:

- [x] Database migrations applied
- [x] Storage bucket created
- [x] Row Level Security (RLS) policies configured
- [x] API keys generated

### 4. Repository Preparation

```bash
# Ensure your code is committed and pushed
git add .
git commit -m "Prepare for deployment"
git push origin main
```

## Vercel Configuration

### vercel.json Configuration

The project includes an optimized `vercel.json` file:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key",
    "SUPABASE_SERVICE_ROLE_KEY": "@supabase-service-key"
  },
  "build": {
    "env": {
      "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=60, stale-while-revalidate"
        }
      ]
    }
  ],
  "redirects": [
    {
      "source": "/home",
      "destination": "/dashboard",
      "permanent": true
    }
  ]
}
```

### Package.json Scripts

Ensure your `package.json` has the correct scripts:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "setup-db": "node scripts/setup-db.js"
  }
}
```

## Environment Variables

### Development Environment

```bash
# .env.local (for local development)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Production Environment

Configure these in Vercel dashboard:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ0eXAiOiJKV1QiLCJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ0eXAiOiJKV1QiLCJhbGc...` |
| `NEXT_PUBLIC_APP_URL` | Your production URL | `https://thinkchrist.vercel.app` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID | - |
| `NEXT_PUBLIC_HOTJAR_ID` | Hotjar tracking ID | - |
| `SENTRY_DSN` | Sentry error tracking | - |

## Deployment Process

### Method 1: Vercel Dashboard (Recommended)

1. **Import Project**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Select "Import Git Repository"
   - Choose your GitHub repository

2. **Configure Project**
   - Vercel will auto-detect Next.js
   - Set root directory to `.` (default)
   - Framework preset: `Next.js`
   - Build command: `npm run build` (auto-detected)
   - Output directory: `.next` (auto-detected)

3. **Add Environment Variables**
   - In project settings, go to "Environment Variables"
   - Add all required variables for Production, Preview, and Development
   - Use the table above as reference

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (usually 2-5 minutes)
   - Your app will be live at `https://your-project.vercel.app`

### Method 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy from project root
vercel

# Follow the prompts:
# ? Set up and deploy "~/your-project"? [Y/n] y
# ? Which scope do you want to deploy to? Your Name
# ? Link to existing project? [y/N] n
# ? What's your project's name? thinkchrist-platform
# ? In which directory is your code located? ./

# For production deployment
vercel --prod
```

### Method 3: GitHub Integration (Automatic)

1. **Connect Repository**
   - In Vercel dashboard, go to project settings
   - Navigate to "Git Integration"
   - Connect your GitHub repository

2. **Configure Auto-Deploy**
   - Production branch: `main`
   - Preview branches: All other branches
   - Automatic deployments: Enabled

3. **Deploy**
   - Push to `main` branch triggers production deployment
   - Push to other branches creates preview deployments

## Post-Deployment Verification

### 1. Functional Testing

Test these critical features:

- [x] User registration and login
- [x] Resource upload and download
- [x] Search functionality
- [x] Gamification features (points, badges)
- [x] Admin panel access
- [x] API endpoints responding correctly

### 2. Performance Testing

```bash
# Test with Lighthouse (install Chrome extension)
# Or use CLI
npm install -g lighthouse
lighthouse https://your-domain.vercel.app --view
```

Target scores:
- Performance: >90
- Accessibility: >95
- Best Practices: >90
- SEO: >90

### 3. Error Monitoring

Check Vercel function logs:
- Go to Vercel dashboard
- Navigate to "Functions" tab
- Monitor for any errors or warnings

### 4. Database Connectivity

Verify Supabase connection:
```bash
# Test API endpoints
curl https://your-domain.vercel.app/api/auth/user
curl https://your-domain.vercel.app/api/resources
```

## Custom Domain Setup

### 1. Add Domain in Vercel

1. Go to project settings in Vercel
2. Navigate to "Domains"
3. Click "Add Domain"
4. Enter your domain (e.g., `thinkchrist.com`)

### 2. Configure DNS

Add these DNS records with your domain provider:

**For root domain (thinkchrist.com):**
```
Type: A
Name: @
Value: 76.76.19.61
```

**For www subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### 3. SSL Certificate

Vercel automatically provisions SSL certificates:
- Usually takes 5-10 minutes
- Supports automatic renewal
- Includes both root and www domains

### 4. Update Environment Variables

Update `NEXT_PUBLIC_APP_URL` to your custom domain:
```bash
NEXT_PUBLIC_APP_URL=https://thinkchrist.com
```

## Performance Optimization

### 1. Build Optimization

The modular architecture provides several benefits:

- **Tree Shaking**: Unused code automatically removed
- **Code Splitting**: Features loaded on-demand
- **Bundle Analysis**: Use `npm run analyze` to check bundle size

### 2. Image Optimization

```typescript
// Use Next.js Image component
import Image from 'next/image'

<Image
  src="/logo.png"
  alt="ThinkChrist Logo"
  width={200}
  height={100}
  priority // For above-the-fold images
/>
```

### 3. Caching Strategy

Configure caching headers in `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/api/resources",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "s-maxage=300, stale-while-revalidate=600"
        }
      ]
    },
    {
      "source": "/(.*\\.(js|css|png|jpg|jpeg|gif|ico|svg))",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 4. Database Optimization

- Use database indexes for frequently queried fields
- Implement pagination for large datasets
- Use Supabase Edge Functions for complex operations

## Monitoring and Analytics

### 1. Vercel Analytics

Enable in project settings:
- Go to "Analytics" tab
- Enable Web Analytics
- View performance metrics and user insights

### 2. Error Tracking

Add Sentry for error monitoring:

```bash
npm install @sentry/nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
})
```

### 3. Performance Monitoring

Monitor key metrics:
- Page load times
- API response times
- Error rates
- User engagement

### 4. Uptime Monitoring

Set up monitoring with services like:
- Vercel's built-in monitoring
- UptimeRobot
- Pingdom

## Troubleshooting

### Common Build Issues

**TypeScript Errors:**
```bash
# Check for type errors
npx tsc --noEmit

# Fix common issues
npm run lint -- --fix
```

**Dependency Issues:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Environment Variable Issues:**
- Ensure all required variables are set in Vercel
- Check variable names match exactly (case-sensitive)
- Verify Supabase keys are correct

### Runtime Issues

**API Errors:**
- Check Vercel function logs
- Verify Supabase connection
- Test API endpoints locally

**Database Connection:**
```bash
# Test Supabase connection
curl -H "apikey: YOUR_ANON_KEY" \
     -H "Authorization: Bearer YOUR_ANON_KEY" \
     https://your-project.supabase.co/rest/v1/users
```

**Performance Issues:**
- Check bundle size with `npm run analyze`
- Optimize images and assets
- Review database queries

### Deployment Failures

**Build Timeout:**
- Optimize build process
- Remove unnecessary dependencies
- Use Vercel Pro for longer build times

**Memory Issues:**
- Optimize code and reduce bundle size
- Use dynamic imports for large components
- Consider upgrading Vercel plan

### Getting Help

1. **Vercel Documentation**: [vercel.com/docs](https://vercel.com/docs)
2. **Supabase Documentation**: [supabase.com/docs](https://supabase.com/docs)
3. **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
4. **Community Support**: GitHub Issues, Discord, Stack Overflow

## Deployment Checklist

Before going live:

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificate active
- [ ] Custom domain configured (if applicable)
- [ ] Error monitoring set up
- [ ] Performance metrics baseline established
- [ ] Backup strategy in place
- [ ] Team access configured
- [ ] Documentation updated

## Maintenance

### Regular Tasks

- Monitor error rates and performance
- Update dependencies monthly
- Review and optimize database queries
- Check security updates
- Backup database regularly

### Scaling Considerations

- Monitor Vercel usage limits
- Consider upgrading plan for higher traffic
- Implement caching strategies
- Optimize database performance
- Consider CDN for static assets

---

**Need Help?** Contact the development team or refer to the project documentation for additional support.