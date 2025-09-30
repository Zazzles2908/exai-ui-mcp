# Supabase Integration - Quick Start Guide

## Overview

This guide will help you integrate your EXAI UI MCP project with your existing Supabase Pro database ("Personal AI").

## Your Supabase Project

- **Project ID:** `mxaazuhlqewmkweewyaz`
- **URL:** `https://mxaazuhlqewmkweewyaz.supabase.co`
- **Region:** ap-southeast-2 (Sydney)
- **PostgreSQL:** 17.6.1

## Step-by-Step Integration

### Step 1: Run Database Migration

```bash
# Navigate to project root
cd c:\Project\exai_UI_mcp

# Apply migration to Supabase
supabase db push --project-ref mxaazuhlqewmkweewyaz
```

Or manually run the SQL in Supabase SQL Editor:
- Open: https://supabase.com/dashboard/project/mxaazuhlqewmkweewyaz/sql
- Copy contents of `supabase/migrations/001_exai_schema.sql`
- Execute

This creates:
- `exai_conversations` - EXAI tool conversations
- `exai_messages` - Messages within conversations
- `exai_workflows` - Multi-step workflow tracking
- `exai_workflow_steps` - Individual workflow steps
- `exai_files` - File uploads
- `exai_user_settings` - User preferences
- `exai-files` storage bucket
- RLS policies for all tables

### Step 2: Get Supabase Credentials

1. Go to: https://supabase.com/dashboard/project/mxaazuhlqewmkweewyaz/settings/api
2. Copy:
   - **Project URL** (already have: https://mxaazuhlqewmkweewyaz.supabase.co)
   - **anon/public key**
   - **service_role key** (keep secret!)

### Step 3: Update Environment Variables

Create `app/.env.production`:

```env
# Adapter Mode
ADAPTER_MODE=supabase

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://mxaazuhlqewmkweewyaz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# EXAI Configuration (see Step 4)
EXAI_CLOUD_URL=https://your-exai-daemon.fly.dev
EXAI_TIMEOUT=300000

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret

# Application
NODE_ENV=production
```

### Step 4: Deploy EXAI Daemon to Cloud

**Problem:** Supabase Edge Functions can't access `http://127.0.0.1:8765`

**Solution Options:**

#### Option A: Deploy to Fly.io (Recommended)

```bash
# Install Fly CLI
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"

# Login
fly auth login

# Create app
fly launch --name exai-daemon

# Deploy
fly deploy

# Get URL
fly info
# Use this URL in EXAI_CLOUD_URL
```

#### Option B: Use Ngrok (Development/Testing Only)

```bash
# Install ngrok
choco install ngrok

# Start tunnel
ngrok http 8765

# Copy HTTPS URL (e.g., https://abc123.ngrok.io)
# Use in EXAI_CLOUD_URL
```

#### Option C: Keep Local Development

For development, keep using:
```env
ADAPTER_MODE=local
EXAI_DAEMON_URL=http://127.0.0.1:8765
```

### Step 5: Complete Supabase Adapter Implementation

The `SupabaseDatabaseAdapter.ts` file needs completion. Add remaining methods:

```typescript
// Add to app/lib/adapters/implementations/SupabaseDatabaseAdapter.ts

// Workflow operations
async createWorkflow(data: CreateWorkflowInput): Promise<Workflow> {
  const { data: workflow, error } = await this.supabase
    .from('exai_workflows')
    .insert({
      conversation_id: data.conversationId,
      tool_type: data.toolType,
      status: data.status,
      current_step: data.currentStep,
      total_steps: data.totalSteps,
      continuation_id: data.continuationId,
      result: data.result,
    })
    .select()
    .single()

  if (error) throw error
  return this.mapWorkflow(workflow)
}

// ... implement getWorkflow, getWorkflows, updateWorkflow, deleteWorkflow

// WorkflowStep operations
async createWorkflowStep(data: CreateWorkflowStepInput): Promise<WorkflowStep> {
  const { data: step, error } = await this.supabase
    .from('exai_workflow_steps')
    .insert({
      workflow_id: data.workflowId,
      step_number: data.stepNumber,
      findings: data.findings,
      hypothesis: data.hypothesis,
      confidence: data.confidence,
      status: data.status,
      metadata: data.metadata,
    })
    .select()
    .single()

  if (error) throw error
  return this.mapWorkflowStep(step)
}

// ... implement remaining methods

// Helper mappers
private mapWorkflow(data: any): Workflow {
  return {
    id: data.id,
    conversationId: data.conversation_id,
    toolType: data.tool_type,
    status: data.status,
    currentStep: data.current_step,
    totalSteps: data.total_steps,
    continuationId: data.continuation_id,
    result: data.result,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
  }
}

private mapWorkflowStep(data: any): WorkflowStep {
  return {
    id: data.id,
    workflowId: data.workflow_id,
    stepNumber: data.step_number,
    findings: data.findings,
    hypothesis: data.hypothesis,
    confidence: data.confidence,
    status: data.status,
    metadata: data.metadata,
    createdAt: new Date(data.created_at),
  }
}

// ... add mappers for File, UserSettings, Session
```

### Step 6: Create Supabase EXAI Adapter

Create `app/lib/adapters/implementations/SupabaseExaiAdapter.ts`:

```typescript
import { IExaiAdapter, ExaiToolParams, ExaiResponse } from '../interfaces/IExaiAdapter'

export class SupabaseExaiAdapter implements IExaiAdapter {
  private exaiUrl: string

  constructor() {
    this.exaiUrl = process.env.EXAI_CLOUD_URL || 'http://127.0.0.1:8765'
  }

  async executeChat(params: any): Promise<ExaiResponse> {
    return this.makeRequest('/chat', params)
  }

  async executeDebug(params: ExaiToolParams): Promise<ExaiResponse> {
    return this.makeRequest('/debug', params)
  }

  // ... implement all other tools

  private async makeRequest(endpoint: string, params: any): Promise<ExaiResponse> {
    const response = await fetch(`${this.exaiUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      throw new Error(`EXAI request failed: ${response.statusText}`)
    }

    return response.json()
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.exaiUrl}/health`)
      return response.ok
    } catch {
      return false
    }
  }
}
```

### Step 7: Update Adapter Factory

Update `app/lib/adapters/AdapterFactory.ts`:

```typescript
import { SupabaseExaiAdapter } from './implementations/SupabaseExaiAdapter'
import { SupabaseDatabaseAdapter } from './implementations/SupabaseDatabaseAdapter'

// In getExaiAdapter():
case 'supabase':
  this.exaiAdapter = new SupabaseExaiAdapter()
  break

// In getDatabaseAdapter():
case 'supabase':
  this.databaseAdapter = new SupabaseDatabaseAdapter()
  break
```

### Step 8: Test Integration

```bash
# Set environment to Supabase mode
$env:ADAPTER_MODE="supabase"

# Start development server
cd app
npm run dev

# Test health check
curl http://localhost:3000/api/health
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

### Step 9: Deploy to Production

```bash
# Build application
npm run build

# Deploy to Vercel (recommended)
vercel --prod

# Or deploy to your preferred hosting
```

## Switching Between Local and Supabase

### Local Development
```env
ADAPTER_MODE=local
DATABASE_URL="postgresql://postgres:password@localhost:5432/exai_ui"
EXAI_DAEMON_URL=http://127.0.0.1:8765
```

### Supabase Production
```env
ADAPTER_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://mxaazuhlqewmkweewyaz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
SUPABASE_SERVICE_ROLE_KEY=your-key
EXAI_CLOUD_URL=https://your-exai-daemon.fly.dev
```

## Troubleshooting

### Database Connection Issues
```bash
# Test Supabase connection
curl https://mxaazuhlqewmkweewyaz.supabase.co/rest/v1/exai_conversations \
  -H "apikey: YOUR_ANON_KEY"
```

### EXAI Daemon Issues
```bash
# Test EXAI daemon
curl https://your-exai-daemon.fly.dev/health
```

### RLS Policy Issues
- Check policies in Supabase Dashboard > Authentication > Policies
- Ensure user is authenticated
- Verify user_id matches auth.uid()

## Next Steps

1. ✅ Run database migration
2. ✅ Get Supabase credentials
3. ✅ Update environment variables
4. ⏳ Deploy EXAI daemon to cloud
5. ⏳ Complete Supabase adapters
6. ⏳ Test integration
7. ⏳ Deploy to production

## Resources

- **Supabase Dashboard:** https://supabase.com/dashboard/project/mxaazuhlqewmkweewyaz
- **Supabase Docs:** https://supabase.com/docs
- **EXAI Documentation:** See `docs/` folder
- **Implementation Guide:** See `docs/IMPLEMENTATION-GUIDE.md`

