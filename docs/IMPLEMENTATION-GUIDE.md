# EXAI UI Implementation Guide

## Overview

This guide explains the adapter pattern architecture implemented for the EXAI UI project, allowing seamless switching between local development and Supabase production environments.

## Architecture

### Adapter Pattern

The project uses an **Adapter Pattern** to abstract both EXAI backend communication and database operations. This allows us to:

1. Develop locally with PostgreSQL and local EXAI daemon
2. Migrate to Supabase in the future with minimal code changes
3. Switch between environments using a single configuration variable

### Components

```
app/
├── lib/
│   ├── adapters/
│   │   ├── interfaces/
│   │   │   ├── IExaiAdapter.ts          # EXAI adapter interface
│   │   │   └── IDatabaseAdapter.ts      # Database adapter interface
│   │   ├── implementations/
│   │   │   ├── LocalExaiAdapter.ts      # Local EXAI daemon implementation
│   │   │   ├── LocalDatabaseAdapter.ts  # Local PostgreSQL implementation
│   │   │   ├── SupabaseExaiAdapter.ts   # Future: Supabase implementation
│   │   │   └── SupabaseDatabaseAdapter.ts # Future: Supabase implementation
│   │   └── AdapterFactory.ts            # Factory for creating adapters
│   ├── auth.ts                          # NextAuth configuration
│   └── db.ts                            # Prisma client singleton
├── app/
│   └── api/
│       ├── health/                      # Health check endpoint
│       ├── auth/                        # Authentication endpoints
│       ├── exai/                        # EXAI tool endpoints
│       └── conversations/               # Conversation management
└── prisma/
    └── schema.prisma                    # Database schema
```

## Setup Instructions

### Prerequisites

1. **Docker Desktop** - For running PostgreSQL locally
2. **Node.js 18+** - For running the Next.js application
3. **EXAI Daemon** - Running on `http://127.0.0.1:8765`

### Step 1: Setup Local Database

Run the setup script to create a PostgreSQL container:

```powershell
.\scripts\setup-local-db.ps1
```

This script will:
- Create a Docker container with PostgreSQL 16
- Create the database `exai_ui`
- Generate a `.env` file with database credentials
- Run Prisma migrations

### Step 2: Verify Environment Variables

Check your `app/.env` file:

```env
# Adapter Configuration
ADAPTER_MODE=local

# Database Configuration
DATABASE_URL="postgresql://postgres:exai_dev_password@localhost:5432/exai_ui?schema=public"

# EXAI Daemon Configuration
EXAI_DAEMON_URL=http://127.0.0.1:8765
EXAI_TIMEOUT=300000

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generated-secret>

# Application Configuration
NODE_ENV=development
```

### Step 3: Install Dependencies

```bash
cd app
npm install
```

### Step 4: Generate Prisma Client

```bash
npx prisma generate
```

### Step 5: Run Database Migrations

```bash
npx prisma migrate dev --name init
```

### Step 6: Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Health Check

```
GET /api/health
```

Returns the health status of EXAI and Database adapters.

### Authentication

```
POST /api/auth/register
Body: { email, password, name? }
```

Register a new user.

```
POST /api/auth/signin
Body: { email, password }
```

Sign in (handled by NextAuth).

### EXAI Chat

```
POST /api/exai/chat
Body: {
  prompt: string
  conversationId?: string
  model?: string
  temperature?: number
  thinking_mode?: 'minimal' | 'low' | 'medium' | 'high' | 'max'
  use_websearch?: boolean
  files?: string[]
  images?: string[]
  continuation_id?: string
}
```

Execute a chat request.

### EXAI Tools

```
POST /api/exai/{tool}
Body: {
  step: string
  step_number: number
  total_steps: number
  next_step_required: boolean
  findings: string
  conversationId?: string
  workflowId?: string
  continuation_id?: string
  ... (tool-specific parameters)
}
```

Execute a workflow tool (debug, analyze, codereview, etc.).

Available tools:
- `debug` - Debug workflow
- `analyze` - Code analysis
- `codereview` - Code review
- `secaudit` - Security audit
- `docgen` - Documentation generation
- `testgen` - Test generation
- `planner` - Planning workflow
- `consensus` - Consensus workflow
- `precommit` - Pre-commit validation
- `refactor` - Refactoring analysis
- `tracer` - Code tracing
- `thinkdeep` - Deep thinking workflow

### Conversations

```
GET /api/conversations
Query: limit?, offset?, toolType?
```

List all conversations for the authenticated user.

```
POST /api/conversations
Body: { title?, toolType }
```

Create a new conversation.

```
GET /api/conversations/{id}
```

Get conversation details.

```
PUT /api/conversations/{id}
Body: { title? }
```

Update conversation.

```
DELETE /api/conversations/{id}
```

Delete conversation.

```
GET /api/conversations/{id}/messages
Query: limit?, offset?
```

Get all messages for a conversation.

## Adapter Configuration

### Local Mode (Current)

```env
ADAPTER_MODE=local
EXAI_DAEMON_URL=http://127.0.0.1:8765
DATABASE_URL="postgresql://postgres:password@localhost:5432/exai_ui?schema=public"
```

### Supabase Mode (Future)

```env
ADAPTER_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
```

## Database Schema

The database schema includes:

- **User** - User accounts with authentication
- **Conversation** - Chat/workflow sessions
- **Message** - Individual messages in conversations
- **Workflow** - Multi-step workflow tracking
- **WorkflowStep** - Individual steps in workflows
- **File** - Uploaded files
- **UserSettings** - User preferences
- **Session** - NextAuth sessions

See `app/prisma/schema.prisma` for the complete schema.

## Development Workflow

### 1. Start PostgreSQL

```powershell
docker start exai-ui-postgres
```

### 2. Start EXAI Daemon

Make sure your EXAI daemon is running on `http://127.0.0.1:8765`

### 3. Start Development Server

```bash
cd app
npm run dev
```

### 4. View Database

```bash
npx prisma studio
```

Opens Prisma Studio at `http://localhost:5555` for database inspection.

## Testing

### Test Health Check

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T...",
  "adapters": {
    "mode": "local",
    "exai": { "status": "connected" },
    "database": { "status": "connected" }
  }
}
```

### Test User Registration

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

## Migration to Supabase

When ready to migrate to Supabase:

1. Create Supabase project
2. Run migrations on Supabase database
3. Implement `SupabaseExaiAdapter` and `SupabaseDatabaseAdapter`
4. Update environment variables to use `ADAPTER_MODE=supabase`
5. Deploy to production

The adapter pattern ensures minimal code changes are needed.

## Troubleshooting

### PostgreSQL Connection Issues

```bash
# Check if container is running
docker ps | grep exai-ui-postgres

# View container logs
docker logs exai-ui-postgres

# Restart container
docker restart exai-ui-postgres
```

### EXAI Daemon Connection Issues

```bash
# Test EXAI daemon health
curl http://127.0.0.1:8765/health
```

### Prisma Issues

```bash
# Reset database
npx prisma migrate reset

# Regenerate client
npx prisma generate

# View database
npx prisma studio
```

## Next Steps

1. ✅ Phase 1 Foundation - Complete
2. ⏳ Phase 2 Core Features - Implement enhanced chat UI
3. ⏳ Phase 3 Advanced Tools - Implement tool-specific UIs
4. ⏳ Phase 4 Production - Optimize and deploy

See [Implementation Roadmap](./06-implementation-roadmap.md) for detailed timeline.

