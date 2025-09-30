# Architecture Requirements

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Browser    │  │  Mobile App  │  │  VS Code Ext │      │
│  │   (React)    │  │  (Future)    │  │   (Future)   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │         Next.js Application         │
          │  ┌────────────────────────────────┐ │
          │  │      Frontend (React)          │ │
          │  │  - UI Components               │ │
          │  │  - State Management (Zustand)  │ │
          │  │  - Real-time Updates (WS)      │ │
          │  └────────────────────────────────┘ │
          │  ┌────────────────────────────────┐ │
          │  │      API Routes (Backend)      │ │
          │  │  - /api/auth/*                 │ │
          │  │  - /api/exai/*                 │ │
          │  │  - /api/conversations/*        │ │
          │  │  - /api/files/*                │ │
          │  └────────────────────────────────┘ │
          └──────────────┬─────────────────────┘
                         │
          ┌──────────────┴─────────────────┐
          │                                 │
    ┌─────▼─────┐                  ┌───────▼────────┐
    │ PostgreSQL │                  │  EXAI Backend  │
    │  Database  │                  │   Services     │
    │  (Prisma)  │                  │  - Tools API   │
    └────────────┘                  │  - AI Models   │
                                    │  - Processing  │
                                    └────────────────┘
```

## Backend API Layer

### API Route Structure

```
app/
  api/
    auth/
      [...nextauth]/
        route.ts          # NextAuth.js authentication
    exai/
      chat/
        route.ts          # General chat endpoint
      debug/
        route.ts          # Debug workflow endpoint
      analyze/
        route.ts          # Code analysis endpoint
      codereview/
        route.ts          # Code review endpoint
      [tool]/
        route.ts          # Dynamic tool endpoint
    conversations/
      route.ts            # List conversations
      [id]/
        route.ts          # Get/update/delete conversation
        messages/
          route.ts        # Get messages for conversation
    workflows/
      route.ts            # List workflows
      [id]/
        route.ts          # Get/update workflow
        steps/
          route.ts        # Get workflow steps
    files/
      route.ts            # Upload files
      [id]/
        route.ts          # Get/delete file
    users/
      me/
        route.ts          # Current user profile
        settings/
          route.ts        # User settings
    admin/
      users/
        route.ts          # User management
      analytics/
        route.ts          # Usage analytics
```

### API Endpoint Specifications

#### 1. Authentication Endpoints

**POST /api/auth/signin**
```typescript
Request: {
  email: string
  password: string
}
Response: {
  user: User
  session: Session
  token: string
}
```

**POST /api/auth/signup**
```typescript
Request: {
  email: string
  password: string
  name: string
}
Response: {
  user: User
  message: string
}
```

#### 2. EXAI Tool Endpoints

**POST /api/exai/chat**
```typescript
Request: {
  message: string
  model?: string
  temperature?: number
  use_websearch?: boolean
  files?: string[]  // File IDs
  images?: string[] // Image IDs or base64
  continuation_id?: string
}
Response: {
  status: string
  content: string
  continuation_id?: string
  metadata: {
    model_used: string
    tokens: number
    duration: number
  }
}
```

**POST /api/exai/debug**
```typescript
Request: {
  step: string
  step_number: number
  total_steps: number
  next_step_required: boolean
  findings: string
  hypothesis?: string
  confidence?: string
  files_checked?: string[]
  relevant_files?: string[]
  continuation_id?: string
}
Response: {
  status: string
  step_number: number
  next_step_required: boolean
  continuation_id: string
  required_actions?: string[]
  expert_analysis?: string
}
```

#### 3. Conversation Endpoints

**GET /api/conversations**
```typescript
Response: {
  conversations: Conversation[]
  total: number
  page: number
}
```

**POST /api/conversations**
```typescript
Request: {
  title?: string
  tool_type: string
}
Response: {
  conversation: Conversation
}
```

**GET /api/conversations/[id]**
```typescript
Response: {
  conversation: Conversation
  messages: Message[]
}
```

#### 4. File Endpoints

**POST /api/files**
```typescript
Request: FormData {
  file: File
  conversation_id?: string
}
Response: {
  file: FileRecord
  url: string
}
```

### WebSocket Integration

**Connection:** `wss://[domain]/api/ws`

**Message Types:**
```typescript
// Client → Server
{
  type: 'subscribe'
  conversation_id: string
}

{
  type: 'tool_request'
  tool: string
  params: object
  conversation_id: string
}

// Server → Client
{
  type: 'message_chunk'
  conversation_id: string
  content: string
  is_final: boolean
}

{
  type: 'workflow_update'
  conversation_id: string
  step: number
  status: string
  progress: number
}

{
  type: 'error'
  message: string
  code: string
}
```

## Database Schema

### Core Models

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  password      String
  role          Role      @default(USER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  conversations Conversation[]
  files         File[]
  settings      UserSettings?
  sessions      Session[]
}

enum Role {
  USER
  ADMIN
  SUPER_ADMIN
}

model Conversation {
  id            String    @id @default(cuid())
  title         String?
  toolType      String
  userId        String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  user          User      @relation(fields: [userId], references: [id])
  messages      Message[]
  workflows     Workflow[]
  files         File[]
}

model Message {
  id              String    @id @default(cuid())
  role            String    // 'user' | 'assistant' | 'system'
  content         String    @db.Text
  conversationId  String
  createdAt       DateTime  @default(now())
  
  conversation    Conversation @relation(fields: [conversationId], references: [id])
  attachments     MessageAttachment[]
  metadata        Json?
}

model Workflow {
  id              String    @id @default(cuid())
  conversationId  String
  toolType        String
  status          String    // 'pending' | 'running' | 'completed' | 'failed'
  currentStep     Int       @default(1)
  totalSteps      Int
  continuationId  String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  
  conversation    Conversation @relation(fields: [conversationId], references: [id])
  steps           WorkflowStep[]
  result          Json?
}

model WorkflowStep {
  id          String    @id @default(cuid())
  workflowId  String
  stepNumber  Int
  findings    String    @db.Text
  hypothesis  String?   @db.Text
  confidence  String?
  status      String
  createdAt   DateTime  @default(now())
  
  workflow    Workflow  @relation(fields: [workflowId], references: [id])
  files       File[]
}

model File {
  id              String    @id @default(cuid())
  name            String
  size            Int
  type            String
  url             String
  userId          String
  conversationId  String?
  workflowStepId  String?
  createdAt       DateTime  @default(now())
  
  user            User      @relation(fields: [userId], references: [id])
  conversation    Conversation? @relation(fields: [conversationId], references: [id])
  workflowStep    WorkflowStep? @relation(fields: [workflowStepId], references: [id])
  attachments     MessageAttachment[]
}

model MessageAttachment {
  id        String   @id @default(cuid())
  messageId String
  fileId    String
  
  message   Message  @relation(fields: [messageId], references: [id])
  file      File     @relation(fields: [fileId], references: [id])
}

model UserSettings {
  id                String   @id @default(cuid())
  userId            String   @unique
  defaultModel      String   @default("glm-4.5-flash")
  defaultThinkingMode String @default("medium")
  webSearchEnabled  Boolean  @default(true)
  theme             String   @default("system")
  preferences       Json?
  
  user              User     @relation(fields: [userId], references: [id])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  
  user         User     @relation(fields: [userId], references: [id])
}
```

## Frontend Architecture

### Component Structure

```
app/
  components/
    layout/
      Header.tsx
      Sidebar.tsx
      Footer.tsx
    tools/
      ChatInterface.tsx
      DebugWorkflow.tsx
      AnalyzeWorkflow.tsx
      CodeReviewWorkflow.tsx
      SecurityAuditWorkflow.tsx
      [tool]Workflow.tsx
    shared/
      MessageList.tsx
      MessageInput.tsx
      FileUploader.tsx
      WorkflowProgress.tsx
      ToolSelector.tsx
    ui/
      [existing 50+ components]
```

### State Management (Zustand)

```typescript
// stores/conversationStore.ts
interface ConversationStore {
  conversations: Conversation[]
  activeConversation: Conversation | null
  messages: Message[]
  isLoading: boolean
  
  fetchConversations: () => Promise<void>
  createConversation: (toolType: string) => Promise<Conversation>
  setActiveConversation: (id: string) => void
  addMessage: (message: Message) => void
  updateMessage: (id: string, content: string) => void
}

// stores/workflowStore.ts
interface WorkflowStore {
  activeWorkflows: Map<string, Workflow>
  workflowSteps: Map<string, WorkflowStep[]>
  
  startWorkflow: (conversationId: string, toolType: string) => Promise<Workflow>
  updateWorkflowStep: (workflowId: string, step: WorkflowStep) => void
  completeWorkflow: (workflowId: string, result: any) => void
}

// stores/userStore.ts
interface UserStore {
  user: User | null
  settings: UserSettings | null
  isAuthenticated: boolean
  
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>
}
```

### Real-time Communication

```typescript
// lib/websocket.ts
class WebSocketManager {
  private ws: WebSocket | null = null
  private subscriptions: Map<string, Set<(data: any) => void>>
  
  connect(): void
  disconnect(): void
  subscribe(conversationId: string, callback: (data: any) => void): void
  unsubscribe(conversationId: string, callback: (data: any) => void): void
  send(message: any): void
}
```

---

**Next Steps:** Review [EXAI Tools Integration](./04-exai-tools-integration.md) for tool-specific requirements.

