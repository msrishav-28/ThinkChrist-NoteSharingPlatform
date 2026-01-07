# Deployment Guide

> Instructions for deploying ThinkChrist Note Sharing Platform to Vercel.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Deployment Methods](#deployment-methods)
- [Custom Domain](#custom-domain)
- [Post-Deployment](#post-deployment)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- [x] GitHub repository with your code
- [x] [Vercel account](https://vercel.com)
- [x] Supabase project with database and storage configured
- [x] All environment variables ready
- [x] Code tested locally (`npm run build` succeeds)

---

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://abc123.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJ0eXAiOiJKV1Q...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJ0eXAiOiJKV1Q...` |
| `NEXT_PUBLIC_APP_URL` | Production URL | `https://thinkchrist.vercel.app` |

### Optional Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_GA_ID` | Google Analytics ID |
| `SENTRY_DSN` | Sentry error tracking |

---

## Deployment Methods

### Method 1: Vercel Dashboard (Recommended)

1. **Import Project**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "New Project" → "Import Git Repository"
   - Select your GitHub repository

2. **Configure Project**
   - Framework preset: `Next.js` (auto-detected)
   - Root directory: `.` (default)

3. **Add Environment Variables**
   - Go to Settings → Environment Variables
   - Add all required variables

4. **Deploy**
   - Click "Deploy"
   - Wait for build (2-5 minutes)
   - Live at `https://your-project.vercel.app`

### Method 2: Vercel CLI

```bash
# Install CLI
npm i -g vercel

# Login
vercel login

# Deploy (preview)
vercel

# Deploy (production)
vercel --prod
```

### Method 3: Auto-Deploy (Git Integration)

Push to `main` branch → Automatic production deployment
Push to other branches → Preview deployments

---

## Custom Domain

### Setup Steps

1. Go to Project Settings → Domains
2. Add your domain (e.g., `thinkchrist.com`)
3. Configure DNS records:

**Root domain:**
```
Type: A
Name: @
Value: 76.76.19.61
```

**WWW subdomain:**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

4. SSL certificate provisioned automatically (5-10 min)
5. Update `NEXT_PUBLIC_APP_URL` to your custom domain

---

## Post-Deployment

### Verification Checklist

- [ ] User registration and login works
- [ ] Resource upload and download works
- [ ] Search functionality works
- [ ] Admin panel accessible
- [ ] API endpoints responding

### Performance Testing

```bash
npm install -g lighthouse
lighthouse https://your-domain.vercel.app --view
```

Target scores:
- Performance: >90
- Accessibility: >95
- Best Practices: >90
- SEO: >90

---

## Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Build fails | Run `npm run build` locally, fix errors |
| TypeScript errors | Run `npx tsc --noEmit` to check |
| Env vars not working | Verify names match exactly (case-sensitive) |
| Database connection fails | Check Supabase keys are correct |

### Build Commands

```bash
# Check for TypeScript errors
npx tsc --noEmit

# Check for lint errors
npm run lint

# Clean reinstall
rm -rf node_modules package-lock.json
npm install
```

### Getting Help

- [Vercel Docs](https://vercel.com/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)

---

## Pre-Launch Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificate active
- [ ] Error monitoring set up
- [ ] Documentation updated

---

**Need Help?** Open an issue or refer to the project documentation.