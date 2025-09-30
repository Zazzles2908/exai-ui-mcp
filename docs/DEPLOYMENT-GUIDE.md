# EXAI UI MCP - Deployment Guide

## Overview

This guide walks you through deploying the EXAI UI MCP application to production using Supabase and cloud hosting.

## Prerequisites

- ✅ Supabase Pro account
- ✅ EXAI daemon source code
- ✅ Vercel/Netlify account (or preferred hosting)
- ✅ Domain name (optional)

## Deployment Architecture

```
User → Vercel (Next.js App) → Supabase (Database + Storage)
                            → Fly.io (EXAI Daemon)
```

---

## Step 1: Deploy EXAI Daemon to Fly.io

### 1.1 Install Fly CLI

**Windows:**
```powershell
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

**Mac/Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

### 1.2 Login to Fly.io

```bash
fly auth login
```

### 1.3 Create Fly.io App

Navigate to your EXAI daemon directory:

```bash
cd path/to/exai-daemon

# Initialize Fly app
fly launch --name exai-daemon-prod

# Follow prompts:
# - Choose region (same as Supabase: ap-southeast-2)
# - Don't deploy yet
```

### 1.4 Configure fly.toml

Create or edit `fly.toml`:

```toml
app = "exai-daemon-prod"
primary_region = "syd" # Sydney (ap-southeast-2)

[build]
  # Adjust based on your EXAI daemon setup
  dockerfile = "Dockerfile"

[env]
  PORT = "8765"

[http_service]
  internal_port = 8765
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[services]]
  protocol = "tcp"
  internal_port = 8765

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

[checks]
  [checks.health]
    grace_period = "10s"
    interval = "30s"
    method = "GET"
    path = "/health"
    timeout = "5s"
```

### 1.5 Deploy EXAI Daemon

```bash
fly deploy

# Get the URL
fly info

# Example output: https://exai-daemon-prod.fly.dev
```

### 1.6 Test EXAI Daemon

```bash
curl https://exai-daemon-prod.fly.dev/health
```

Expected response:
```json
{"status": "healthy"}
```

---

## Step 2: Setup Supabase Database

### 2.1 Run Migration

**Option A: Using Supabase CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref mxaazuhlqewmkweewyaz

# Push migration
supabase db push
```

**Option B: Using SQL Editor**

1. Go to: https://supabase.com/dashboard/project/mxaazuhlqewmkweewyaz/sql
2. Copy contents of `supabase/migrations/001_exai_schema.sql`
3. Click "Run"

### 2.2 Verify Tables

```bash
# List tables
supabase db list-tables

# Expected tables:
# - exai_conversations
# - exai_messages
# - exai_workflows
# - exai_workflow_steps
# - exai_files
# - exai_user_settings
# - exai_sessions
# - exai_message_attachments
```

### 2.3 Get Supabase Credentials

1. Go to: https://supabase.com/dashboard/project/mxaazuhlqewmkweewyaz/settings/api
2. Copy:
   - **Project URL:** `https://mxaazuhlqewmkweewyaz.supabase.co`
   - **anon/public key**
   - **service_role key** (keep secret!)

---

## Step 3: Configure Environment Variables

### 3.1 Create Production Environment File

Create `app/.env.production`:

```env
# Adapter Mode
ADAPTER_MODE=supabase

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://mxaazuhlqewmkweewyaz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# EXAI Configuration
EXAI_CLOUD_URL=https://exai-daemon-prod.fly.dev
EXAI_TIMEOUT=300000

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=generate-a-secure-random-string

# Application
NODE_ENV=production
```

### 3.2 Generate NextAuth Secret

```bash
# Generate secure random string
openssl rand -base64 32
```

---

## Step 4: Deploy to Vercel

### 4.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 4.2 Login to Vercel

```bash
vercel login
```

### 4.3 Deploy Application

```bash
cd app

# First deployment (creates project)
vercel

# Production deployment
vercel --prod
```

### 4.4 Configure Environment Variables in Vercel

**Option A: Via CLI**

```bash
vercel env add ADAPTER_MODE production
# Enter: supabase

vercel env add NEXT_PUBLIC_SUPABASE_URL production
# Enter: https://mxaazuhlqewmkweewyaz.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
# Enter: your-anon-key

vercel env add SUPABASE_SERVICE_ROLE_KEY production
# Enter: your-service-role-key

vercel env add EXAI_CLOUD_URL production
# Enter: https://exai-daemon-prod.fly.dev

vercel env add NEXTAUTH_URL production
# Enter: https://your-domain.vercel.app

vercel env add NEXTAUTH_SECRET production
# Enter: your-generated-secret
```

**Option B: Via Dashboard**

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add all variables from `.env.production`

### 4.5 Redeploy with Environment Variables

```bash
vercel --prod
```

---

## Step 5: Configure Custom Domain (Optional)

### 5.1 Add Domain in Vercel

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Go to Settings → Domains
4. Add your domain

### 5.2 Update DNS Records

Add the following DNS records at your domain registrar:

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com

Type: A
Name: @
Value: 76.76.21.21
```

### 5.3 Update NEXTAUTH_URL

```bash
vercel env add NEXTAUTH_URL production
# Enter: https://your-custom-domain.com

vercel --prod
```

---

## Step 6: Test Production Deployment

### 6.1 Health Check

```bash
curl https://your-domain.vercel.app/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "adapters": {
    "mode": "supabase",
    "exai": { "status": "connected" },
    "database": { "status": "connected" }
  }
}
```

### 6.2 Test User Registration

```bash
curl -X POST https://your-domain.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePassword123!",
    "name": "Test User"
  }'
```

### 6.3 Test Chat Endpoint

1. Register a user
2. Sign in
3. Test chat:

```bash
curl -X POST https://your-domain.vercel.app/api/exai/chat \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN" \
  -d '{
    "prompt": "Hello, EXAI!"
  }'
```

---

## Step 7: Monitor and Maintain

### 7.1 Monitor Fly.io

```bash
# View logs
fly logs

# Check status
fly status

# Scale if needed
fly scale count 2
```

### 7.2 Monitor Supabase

1. Go to: https://supabase.com/dashboard/project/mxaazuhlqewmkweewyaz
2. Check:
   - Database health
   - Storage usage
   - API requests
   - RLS policies

### 7.3 Monitor Vercel

1. Go to: https://vercel.com/dashboard
2. Check:
   - Deployment status
   - Function logs
   - Analytics
   - Error tracking

---

## Troubleshooting

### EXAI Daemon Connection Issues

```bash
# Check Fly.io status
fly status

# View logs
fly logs

# Restart
fly apps restart exai-daemon-prod
```

### Supabase Connection Issues

```bash
# Test connection
curl https://mxaazuhlqewmkweewyaz.supabase.co/rest/v1/exai_conversations \
  -H "apikey: YOUR_ANON_KEY"
```

### Vercel Deployment Issues

```bash
# View deployment logs
vercel logs

# Redeploy
vercel --prod --force
```

### RLS Policy Issues

- Check policies in Supabase Dashboard → Authentication → Policies
- Ensure user is authenticated
- Verify `auth.uid()` matches `user_id`

---

## Rollback Procedure

### Rollback Vercel Deployment

```bash
# List deployments
vercel ls

# Promote previous deployment
vercel promote <deployment-url>
```

### Rollback Supabase Migration

```bash
# Create rollback migration
supabase migration new rollback_exai_schema

# Add DROP TABLE statements
# Push migration
supabase db push
```

### Rollback Fly.io Deployment

```bash
# List releases
fly releases

# Rollback to previous version
fly releases rollback <version>
```

---

## Security Checklist

- ✅ HTTPS enabled on all services
- ✅ RLS policies configured
- ✅ Service role key kept secret
- ✅ NEXTAUTH_SECRET is strong and random
- ✅ CORS configured properly
- ✅ Rate limiting enabled
- ✅ Environment variables not committed to git
- ✅ Database backups enabled
- ✅ Monitoring and alerts configured

---

## Cost Estimation

### Fly.io
- **Shared CPU:** ~$5/month
- **Dedicated CPU:** ~$30/month

### Supabase Pro
- **Base:** $25/month
- **Database:** Included (8GB)
- **Storage:** $0.021/GB
- **Bandwidth:** $0.09/GB

### Vercel
- **Hobby:** Free (personal projects)
- **Pro:** $20/month (commercial)

**Total Estimated Cost:** $30-75/month

---

## Next Steps

1. ✅ Deploy EXAI daemon to Fly.io
2. ✅ Run Supabase migration
3. ✅ Configure environment variables
4. ✅ Deploy to Vercel
5. ✅ Test production deployment
6. ⏳ Set up monitoring and alerts
7. ⏳ Configure backups
8. ⏳ Set up CI/CD pipeline

---

**Deployment Complete!** 🎉

Your EXAI UI MCP application is now running in production with:
- Scalable cloud infrastructure
- Secure multi-tenant database
- Real-time capabilities
- Global CDN distribution

