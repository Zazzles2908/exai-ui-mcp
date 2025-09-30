# Supabase Integration Guide

## Overview

This guide provides a comprehensive strategy for integrating the EXAI UI MCP project with your Supabase Pro database.

## Your Supabase Project

**Project Details:**
- **Name:** Personal AI
- **Project ID:** `mxaazuhlqewmkweewyaz`
- **URL:** `https://mxaazuhlqewmkweewyaz.supabase.co`
- **Region:** ap-southeast-2 (Sydney)
- **PostgreSQL Version:** 17.6.1

**Existing Tables:**
- `users` - User accounts (RLS enabled)
- `conversations` - Chat conversations (RLS enabled)
- `core_memory` - Long-term memory (RLS enabled)
- `week_memory` - Weekly summaries (RLS enabled)
- `slips` - Quick notes (RLS enabled)

## Integration Architecture

### 1. Database Schema Migration

**Strategy:** Extend existing schema with EXAI-specific tables while preserving current data.

**New Tables to Add:**
- `exai_conversations` - EXAI tool conversations (separate from existing conversations)
- `exai_messages` - Messages within EXAI conversations
- `exai_workflows` - Multi-step workflow tracking
- `exai_workflow_steps` - Individual workflow steps
- `exai_files` - File uploads and attachments
- `exai_user_settings` - User preferences for EXAI tools
- `exai_sessions` - NextAuth session management

**Migration SQL:**
```sql
-- See supabase/migrations/001_exai_schema.sql
```

### 2. Supabase Edge Functions Architecture

**Challenge:** Edge Functions cannot access localhost EXAI daemon (http://127.0.0.1:8765)

**Solutions:**

#### Option A: Cloud-Hosted EXAI Daemon (Recommended for Production)
Deploy EXAI daemon as a cloud service accessible via HTTPS:
- Deploy to Fly.io, Railway, or similar
- Use internal networking within Supabase
- Secure with API keys

#### Option B: Ngrok Tunnel (Development Only)
```bash
ngrok http 8765
# Use generated URL: https://abc123.ngrok.io
```

#### Option C: Hybrid Architecture (Best of Both Worlds)
- **Development:** Local EXAI daemon + local PostgreSQL
- **Production:** Cloud EXAI daemon + Supabase

**Edge Function Structure:**
```
supabase/functions/
├── exai-chat/           # Chat tool
├── exai-debug/          # Debug workflow
├── exai-analyze/        # Code analysis
├── exai-codereview/     # Code review
├── exai-secaudit/       # Security audit
├── exai-docgen/         # Documentation generation
├── exai-testgen/        # Test generation
├── exai-planner/        # Planning workflow
├── exai-consensus/      # Consensus workflow
├── exai-precommit/      # Pre-commit validation
├── exai-refactor/       # Refactoring analysis
├── exai-tracer/         # Code tracing
├── exai-thinkdeep/      # Deep thinking
└── _shared/             # Shared utilities
    ├── exai-client.ts   # EXAI HTTP client
    ├── auth.ts          # Authentication helpers
    └── cors.ts          # CORS configuration
```

### 3. Supabase Database Adapter

**Implementation:**
```typescript
// lib/adapters/implementations/SupabaseDatabaseAdapter.ts
import { createClient } from '@supabase/supabase-js'
import { IDatabaseAdapter } from '../interfaces/IDatabaseAdapter'

export class SupabaseDatabaseAdapter implements IDatabaseAdapter {
  private supabase: SupabaseClient

  constructor() {
    this.supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Server-side only
    )
  }

  async createConversation(data: CreateConversationInput) {
    const { data: conversation, error } = await this.supabase
      .from('exai_conversations')
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return conversation
  }

  // ... implement all other methods
}
```

### 4. Supabase EXAI Adapter

**Implementation:**
```typescript
// lib/adapters/implementations/SupabaseExaiAdapter.ts
import { IExaiAdapter } from '../interfaces/IExaiAdapter'

export class SupabaseExaiAdapter implements IExaiAdapter {
  private exaiUrl: string

  constructor() {
    // In production, this would be your cloud-hosted EXAI daemon
    this.exaiUrl = process.env.EXAI_CLOUD_URL || 'https://your-exai-daemon.fly.dev'
  }

  async executeChat(params) {
    // Call Supabase Edge Function instead of direct EXAI
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/exai-chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(params),
      }
    )

    return response.json()
  }

  // ... implement all other tools
}
```

### 5. Row Level Security (RLS) Policies

**Multi-Tenant Security:**

```sql
-- Enable RLS on all EXAI tables
ALTER TABLE exai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE exai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE exai_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE exai_workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE exai_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE exai_user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only access their own conversations
CREATE POLICY "Users can view own conversations" ON exai_conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations" ON exai_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON exai_conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON exai_conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Messages inherit conversation permissions
CREATE POLICY "Users can view messages in own conversations" ON exai_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM exai_conversations
      WHERE id = exai_messages.conversation_id
      AND user_id = auth.uid()
    )
  );

-- Similar policies for workflows, files, etc.
```

### 6. Supabase Storage for Files

**Bucket Configuration:**
```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('exai-files', 'exai-files', false);

-- RLS policies for storage
CREATE POLICY "Users can upload own files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'exai-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can view own files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'exai-files' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

**File Upload Implementation:**
```typescript
// Upload file to Supabase Storage
const { data, error } = await supabase.storage
  .from('exai-files')
  .upload(`${userId}/${conversationId}/${filename}`, file, {
    cacheControl: '3600',
    upsert: false
  })

// Get public URL
const { data: { publicUrl } } = supabase.storage
  .from('exai-files')
  .getPublicUrl(`${userId}/${conversationId}/${filename}`)
```

### 7. Real-time Subscriptions

**Implementation:**
```typescript
// Subscribe to new messages in a conversation
const subscription = supabase
  .channel(`conversation:${conversationId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'public',
      table: 'exai_messages',
      filter: `conversation_id=eq.${conversationId}`
    },
    (payload) => {
      console.log('New message:', payload.new)
      // Update UI with new message
    }
  )
  .subscribe()

// Subscribe to workflow progress
const workflowSub = supabase
  .channel(`workflow:${workflowId}`)
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'exai_workflows',
      filter: `id=eq.${workflowId}`
    },
    (payload) => {
      console.log('Workflow updated:', payload.new)
      // Update progress bar
    }
  )
  .subscribe()
```

### 8. Authentication Integration

**NextAuth.js + Supabase Auth:**

```typescript
// lib/auth.ts
import { SupabaseAdapter } from '@auth/supabase-adapter'

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  providers: [
    CredentialsProvider({
      async authorize(credentials) {
        // Authenticate with Supabase
        const { data, error } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        })

        if (error || !data.user) throw new Error('Invalid credentials')

        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.user_metadata.name,
        }
      },
    }),
  ],
  // ... rest of config
}
```

## Environment Variables

### Development (.env.local)
```env
ADAPTER_MODE=local
DATABASE_URL="postgresql://postgres:password@localhost:5432/exai_ui"
EXAI_DAEMON_URL=http://127.0.0.1:8765
```

### Production (.env.production)
```env
ADAPTER_MODE=supabase

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://mxaazuhlqewmkweewyaz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# EXAI Cloud Daemon
EXAI_CLOUD_URL=https://your-exai-daemon.fly.dev
EXAI_TIMEOUT=300000

# NextAuth
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret
```

## Migration Steps

### Step 1: Prepare Supabase Database
```bash
# Run migration SQL
supabase db push
```

### Step 2: Deploy Edge Functions
```bash
supabase functions deploy exai-chat
supabase functions deploy exai-debug
# ... deploy all functions
```

### Step 3: Configure Storage
```bash
# Create bucket via Supabase Dashboard or SQL
```

### Step 4: Update Environment Variables
```bash
# Set production environment variables
```

### Step 5: Deploy Application
```bash
npm run build
# Deploy to Vercel, Netlify, or your hosting provider
```

## Testing

### Test Supabase Connection
```typescript
const { data, error } = await supabase
  .from('exai_conversations')
  .select('*')
  .limit(1)

console.log('Supabase connected:', !error)
```

### Test Edge Function
```bash
curl -X POST \
  https://mxaazuhlqewmkweewyaz.supabase.co/functions/v1/exai-chat \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Hello"}'
```

## Next Steps

1. ✅ Review this integration guide
2. ⏳ Create Supabase migration SQL files
3. ⏳ Implement SupabaseDatabaseAdapter
4. ⏳ Implement SupabaseExaiAdapter
5. ⏳ Create Edge Functions for all EXAI tools
6. ⏳ Set up RLS policies
7. ⏳ Configure Supabase Storage
8. ⏳ Test integration
9. ⏳ Deploy to production

See implementation files in the next commit.

