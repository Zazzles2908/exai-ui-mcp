# EXAI UI MCP

A comprehensive native web application for interacting with EXAI (Extended AI) tools, featuring 14+ specialized AI workflows with persistent conversations, multi-step workflow management, and seamless cloud integration.

## 🎯 Project Vision

Transform from a basic MCP chat client into a **native EXAI application** that provides users with direct, intuitive access to all EXAI capabilities through specialized tool interfaces, workflow management, and persistent data storage.

## ✨ Features

### Phase 1 - Foundation ✅ **COMPLETE**
- ✅ **Adapter Pattern Architecture** - Seamless switching between local and Supabase modes
- ✅ **Local PostgreSQL Database** - Complete schema with Prisma ORM
- ✅ **Supabase Integration** - Full cloud database support with RLS
- ✅ **Authentication System** - User registration and login with NextAuth.js
- ✅ **EXAI Integration** - Direct connection to EXAI daemon (local or cloud)
- ✅ **API Layer** - RESTful endpoints for all 14+ EXAI tools
- ✅ **Conversation Persistence** - Save and retrieve chat history
- ✅ **Workflow Management** - Multi-step workflow tracking
- ✅ **Health Monitoring** - System health checks for adapters

### Coming Soon (Phase 2-4)
- ⏳ Enhanced chat interface with conversation management
- ⏳ 14+ specialized tool UIs (Debug, Analyze, Code Review, Security Audit, etc.)
- ⏳ Real-time workflow progress tracking
- ⏳ File management and storage
- ⏳ User settings and preferences
- ⏳ Team collaboration features

## 🏗️ Architecture

### Adapter Pattern

The project uses an **Adapter Pattern** to abstract both EXAI backend communication and database operations:

```
┌─────────────┐
│   Next.js   │
│     API     │
└──────┬──────┘
       │
   ┌───┴────┐
   │Factory │
   └───┬────┘
       │
   ┌───┴────────────────┐
   │                    │
┌──▼──────────┐  ┌─────▼────────┐
│EXAI Adapter │  │  DB Adapter  │
└──┬──────────┘  └─────┬────────┘
   │                   │
┌──▼──────┐      ┌─────▼─────┐
│  Local  │      │PostgreSQL │
│  EXAI   │      │  (Prisma) │
│127.0.0.1│      │   Local   │
└─────────┘      └───────────┘
     OR               OR
┌──▼──────┐      ┌─────▼─────┐
│  Cloud  │      │ Supabase  │
│  EXAI   │      │   Cloud   │
│ Fly.io  │      │  Database │
└─────────┘      └───────────┘
```

**Benefits:**
- Switch between local and Supabase with ONE environment variable
- Develop locally, deploy to production seamlessly
- Future-proof architecture for cloud migration

## 🚀 Quick Start

### Prerequisites

- **Docker Desktop** - For running PostgreSQL locally
- **Node.js 18+** - For running the Next.js application
- **EXAI Daemon** - Running on `http://127.0.0.1:8765`

### Local Development Setup (5 minutes)

1. **Clone the repository:**
```bash
git clone https://github.com/Zazzles2908/exai-ui-mcp.git
cd exai-ui-mcp
```

2. **Setup local database:**
```powershell
.\scripts\setup-local-db.ps1
```

This script will:
- Create PostgreSQL Docker container
- Generate `.env` file with credentials
- Run Prisma migrations

3. **Install dependencies:**
```bash
cd app
npm install
```

4. **Start development server:**
```bash
npm run dev
```

5. **Open [http://localhost:3000](http://localhost:3000)**

## 📚 Documentation

Comprehensive documentation is available in the `docs/` folder:

### Core Documentation
- **[SUMMARY.md](docs/SUMMARY.md)** - Executive summary and project overview
- **[VISUAL-ARCHITECTURE.md](docs/VISUAL-ARCHITECTURE.md)** - 🎨 Mermaid diagrams and visual guides
- **[IMPLEMENTATION-GUIDE.md](docs/IMPLEMENTATION-GUIDE.md)** - Setup and development guide
- **[DEPLOYMENT-GUIDE.md](docs/DEPLOYMENT-GUIDE.md)** - Production deployment guide

### Supabase Integration
- **[SUPABASE-INTEGRATION.md](docs/SUPABASE-INTEGRATION.md)** - Comprehensive integration strategy
- **[SUPABASE-QUICK-START.md](docs/SUPABASE-QUICK-START.md)** - Step-by-step Supabase setup

### Project Planning
- **[01-current-state-analysis.md](docs/01-current-state-analysis.md)** - Current state
- **[02-project-vision-and-goals.md](docs/02-project-vision-and-goals.md)** - Vision and goals
- **[03-architecture-requirements.md](docs/03-architecture-requirements.md)** - Architecture
- **[04-exai-tools-integration.md](docs/04-exai-tools-integration.md)** - Tool specifications
- **[05-gap-analysis.md](docs/05-gap-analysis.md)** - Gap analysis
- **[06-implementation-roadmap.md](docs/06-implementation-roadmap.md)** - 16-week roadmap

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 14.2.28 with App Router
- **Language**: TypeScript 5.2.2
- **Styling**: Tailwind CSS 3.3.3
- **UI Components**: Radix UI (50+ components), shadcn/ui
- **State Management**: Zustand, Jotai, React Query, SWR
- **Icons**: Lucide React
- **Animations**: Framer Motion

### Backend
- **API**: Next.js API Routes
- **Database**: PostgreSQL 16 (local) / Supabase (cloud)
- **ORM**: Prisma 6.7.0
- **Authentication**: NextAuth.js 4.24.11
- **Validation**: Zod

### EXAI Integration
- **Local**: HTTP client to EXAI daemon (127.0.0.1:8765)
- **Cloud**: Fly.io hosted EXAI daemon

## 🔧 Configuration

### Environment Variables

**Development (.env.local):**
```env
ADAPTER_MODE=local
DATABASE_URL="postgresql://postgres:password@localhost:5432/exai_ui"
EXAI_DAEMON_URL=http://127.0.0.1:8765
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
```

**Production (.env.production):**
```env
ADAPTER_MODE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://mxaazuhlqewmkweewyaz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
EXAI_CLOUD_URL=https://exai-daemon-prod.fly.dev
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-production-secret
```

## 🧪 API Endpoints

### Health Check
```
GET /api/health
```

### Authentication
```
POST /api/auth/register        # Register new user
POST /api/auth/signin          # Sign in
```

### EXAI Tools
```
POST /api/exai/chat            # Chat interface
POST /api/exai/debug           # Debug workflow
POST /api/exai/analyze         # Code analysis
POST /api/exai/codereview      # Code review
POST /api/exai/secaudit        # Security audit
POST /api/exai/docgen          # Documentation generation
POST /api/exai/testgen         # Test generation
POST /api/exai/planner         # Planning workflow
POST /api/exai/consensus       # Consensus workflow
POST /api/exai/precommit       # Pre-commit validation
POST /api/exai/refactor        # Refactoring analysis
POST /api/exai/tracer          # Code tracing
POST /api/exai/thinkdeep       # Deep thinking
POST /api/exai/challenge       # Critical analysis
```

### Conversations
```
GET    /api/conversations           # List conversations
POST   /api/conversations           # Create conversation
GET    /api/conversations/{id}      # Get conversation
PUT    /api/conversations/{id}      # Update conversation
DELETE /api/conversations/{id}      # Delete conversation
GET    /api/conversations/{id}/messages  # Get messages
```

## 🗄️ Database Schema

The database includes:
- **User** - User accounts with authentication
- **Conversation** - Chat/workflow sessions
- **Message** - Individual messages
- **Workflow** - Multi-step workflow tracking
- **WorkflowStep** - Individual workflow steps
- **File** - Uploaded files
- **UserSettings** - User preferences
- **Session** - NextAuth sessions

View with Prisma Studio:
```bash
cd app
npx prisma studio
```

## 📈 Development Status

**Current Phase:** Phase 1 - Foundation ✅ **COMPLETE**

**Progress:** ~30% complete

**Next Phase:** Phase 2 - Core Features (Weeks 5-8)
- Enhanced chat interface
- Workflow foundation
- Debug and Analyze tools

See [Implementation Roadmap](docs/06-implementation-roadmap.md) for detailed timeline.

## 🚀 Deployment

### Deploy to Production

See [Deployment Guide](docs/DEPLOYMENT-GUIDE.md) for complete instructions.

**Quick Deploy:**

1. Deploy EXAI daemon to Fly.io
2. Run Supabase migration
3. Deploy to Vercel
4. Configure environment variables

```bash
# Deploy EXAI daemon
fly launch --name exai-daemon-prod
fly deploy

# Deploy Next.js app
vercel --prod
```

## 🤝 Contributing

Contributions are welcome! Please:

1. Read the [Implementation Guide](docs/IMPLEMENTATION-GUIDE.md)
2. Check the [Roadmap](docs/06-implementation-roadmap.md)
3. Create a feature branch
4. Submit a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- EXAI team for the powerful AI workflow tools
- Next.js and Vercel for the amazing framework
- Radix UI and shadcn/ui for beautiful components
- Prisma for the excellent ORM
- Supabase for the cloud infrastructure

