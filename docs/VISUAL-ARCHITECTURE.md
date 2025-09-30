# EXAI UI MCP - Visual Architecture Guide

This document provides visual representations of the project architecture using Mermaid diagrams.

## Table of Contents
1. [System Architecture Overview](#system-architecture-overview)
2. [Current vs Target State](#current-vs-target-state)
3. [Database Schema](#database-schema)
4. [API Route Structure](#api-route-structure)
5. [EXAI Tools Workflow](#exai-tools-workflow)
6. [Authentication Flow](#authentication-flow)
7. [Adapter Pattern Architecture](#adapter-pattern-architecture)
8. [Implementation Phases](#implementation-phases)

---

## System Architecture Overview

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        Mobile[Mobile App - Future]
        VSCode[VS Code Extension - Future]
    end
    
    subgraph "Next.js Application"
        subgraph "Frontend"
            UI[React UI Components]
            State[State Management - Zustand]
            WS[WebSocket Client]
        end
        
        subgraph "API Routes"
            AuthAPI[/api/auth/*]
            ExaiAPI[/api/exai/*]
            ConvAPI[/api/conversations/*]
            FileAPI[/api/files/*]
            UserAPI[/api/users/*]
        end
        
        subgraph "Adapters"
            ExaiAdapter[EXAI Adapter Interface]
            DBAdapter[Database Adapter Interface]
            LocalExai[Local EXAI Adapter]
            SupabaseExai[Supabase EXAI Adapter - Future]
            LocalDB[Local PostgreSQL Adapter]
            SupabaseDB[Supabase Adapter - Future]
        end
    end
    
    subgraph "Data Layer"
        Postgres[(PostgreSQL Database)]
        Supabase[(Supabase - Future)]
    end
    
    subgraph "EXAI Backend"
        ExaiDaemon[EXAI Daemon Server<br/>127.0.0.1:8765]
        ExaiTools[EXAI Tools<br/>14+ Specialized Tools]
        AIModels[AI Models<br/>GLM, Kimi, DeepSeek, etc.]
    end
    
    Browser --> UI
    Mobile -.-> UI
    VSCode -.-> UI
    
    UI --> State
    UI --> WS
    UI --> AuthAPI
    UI --> ExaiAPI
    UI --> ConvAPI
    UI --> FileAPI
    UI --> UserAPI
    
    AuthAPI --> DBAdapter
    ConvAPI --> DBAdapter
    FileAPI --> DBAdapter
    UserAPI --> DBAdapter
    
    ExaiAPI --> ExaiAdapter
    
    ExaiAdapter --> LocalExai
    ExaiAdapter -.-> SupabaseExai
    
    DBAdapter --> LocalDB
    DBAdapter -.-> SupabaseDB
    
    LocalDB --> Postgres
    SupabaseDB -.-> Supabase
    
    LocalExai --> ExaiDaemon
    SupabaseExai -.-> Supabase
    
    ExaiDaemon --> ExaiTools
    ExaiTools --> AIModels
    
    WS --> ExaiDaemon
    
    style Browser fill:#e1f5ff
    style UI fill:#fff4e1
    style ExaiAdapter fill:#e8f5e9
    style DBAdapter fill:#e8f5e9
    style Postgres fill:#f3e5f5
    style ExaiDaemon fill:#ffe0b2
```

---

## Current vs Target State

```mermaid
graph LR
    subgraph "Current State - MCP Client"
        U1[User] --> UI1[Web UI]
        UI1 --> WS1[WebSocket]
        WS1 --> MCP[External MCP Server]
        MCP --> EXAI1[EXAI]
        EXAI1 --> AI1[AI Models]
    end
    
    subgraph "Target State - Native EXAI UI"
        U2[User] --> UI2[Web UI]
        UI2 --> API[Next.js API]
        API --> Adapter[Adapter Layer]
        Adapter --> EXAI2[EXAI Backend]
        EXAI2 --> AI2[AI Models]
        API --> DB[(Database)]
    end
    
    style U1 fill:#ffcdd2
    style U2 fill:#c8e6c9
    style MCP fill:#ffcdd2
    style Adapter fill:#c8e6c9
```

---

## Database Schema

```mermaid
erDiagram
    User ||--o{ Conversation : creates
    User ||--o{ File : uploads
    User ||--o{ Session : has
    User ||--|| UserSettings : has
    
    Conversation ||--o{ Message : contains
    Conversation ||--o{ Workflow : has
    Conversation ||--o{ File : attaches
    
    Message ||--o{ MessageAttachment : has
    
    Workflow ||--o{ WorkflowStep : contains
    
    WorkflowStep ||--o{ File : uses
    
    File ||--o{ MessageAttachment : in
    
    User {
        string id PK
        string email UK
        string name
        string password
        enum role
        datetime createdAt
        datetime updatedAt
    }
    
    Conversation {
        string id PK
        string title
        string toolType
        string userId FK
        datetime createdAt
        datetime updatedAt
    }
    
    Message {
        string id PK
        string role
        text content
        string conversationId FK
        json metadata
        datetime createdAt
    }
    
    Workflow {
        string id PK
        string conversationId FK
        string toolType
        string status
        int currentStep
        int totalSteps
        string continuationId
        json result
        datetime createdAt
        datetime updatedAt
    }
    
    WorkflowStep {
        string id PK
        string workflowId FK
        int stepNumber
        text findings
        text hypothesis
        string confidence
        string status
        datetime createdAt
    }
    
    File {
        string id PK
        string name
        int size
        string type
        string url
        string userId FK
        string conversationId FK
        string workflowStepId FK
        datetime createdAt
    }
    
    UserSettings {
        string id PK
        string userId FK
        string defaultModel
        string defaultThinkingMode
        boolean webSearchEnabled
        string theme
        json preferences
    }
    
    Session {
        string id PK
        string sessionToken UK
        string userId FK
        datetime expires
    }
    
    MessageAttachment {
        string id PK
        string messageId FK
        string fileId FK
    }
```

---

## API Route Structure

```mermaid
graph TD
    API[API Routes /api]
    
    API --> Auth[/auth]
    API --> EXAI[/exai]
    API --> Conv[/conversations]
    API --> Files[/files]
    API --> Users[/users]
    API --> Workflows[/workflows]
    API --> Admin[/admin]
    
    Auth --> NextAuth[/[...nextauth]]
    
    EXAI --> Chat[/chat]
    EXAI --> Debug[/debug]
    EXAI --> Analyze[/analyze]
    EXAI --> CodeReview[/codereview]
    EXAI --> SecAudit[/secaudit]
    EXAI --> DocGen[/docgen]
    EXAI --> TestGen[/testgen]
    EXAI --> Planner[/planner]
    EXAI --> Consensus[/consensus]
    EXAI --> Precommit[/precommit]
    EXAI --> Refactor[/refactor]
    EXAI --> Tracer[/tracer]
    EXAI --> Challenge[/challenge]
    EXAI --> ThinkDeep[/thinkdeep]
    
    Conv --> ConvList[GET /]
    Conv --> ConvCreate[POST /]
    Conv --> ConvDetail[/[id]]
    ConvDetail --> ConvGet[GET]
    ConvDetail --> ConvUpdate[PUT]
    ConvDetail --> ConvDelete[DELETE]
    ConvDetail --> Messages[/messages]
    
    Files --> FileUpload[POST /]
    Files --> FileDetail[/[id]]
    FileDetail --> FileGet[GET]
    FileDetail --> FileDelete[DELETE]
    
    Users --> Me[/me]
    Me --> Profile[GET /]
    Me --> Settings[/settings]
    
    Workflows --> WorkflowList[GET /]
    Workflows --> WorkflowDetail[/[id]]
    WorkflowDetail --> WorkflowGet[GET]
    WorkflowDetail --> WorkflowUpdate[PUT]
    WorkflowDetail --> Steps[/steps]
    
    Admin --> AdminUsers[/users]
    Admin --> Analytics[/analytics]
    
    style API fill:#e3f2fd
    style EXAI fill:#fff3e0
    style Auth fill:#f3e5f5
```

---

## EXAI Tools Workflow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant API
    participant Adapter
    participant EXAI
    participant DB
    
    User->>UI: Select Tool (e.g., Debug)
    UI->>API: POST /api/exai/debug (step 1)
    API->>Adapter: executeToolStep(params)
    Adapter->>EXAI: Send tool request
    EXAI-->>Adapter: Response (pause for investigation)
    Adapter-->>API: Return response
    API->>DB: Save workflow step
    API-->>UI: Return step 1 result
    UI-->>User: Display required actions
    
    User->>UI: Investigate & provide findings
    UI->>API: POST /api/exai/debug (step 2)
    API->>Adapter: executeToolStep(params)
    Adapter->>EXAI: Send step 2 request
    EXAI-->>Adapter: Response (continue or complete)
    Adapter-->>API: Return response
    API->>DB: Update workflow step
    API-->>UI: Return step 2 result
    UI-->>User: Display results
    
    alt Workflow Complete
        EXAI-->>Adapter: Expert analysis
        Adapter-->>API: Final result
        API->>DB: Mark workflow complete
        API-->>UI: Return final analysis
        UI-->>User: Display complete results
    else More Steps Needed
        User->>UI: Continue investigation
        Note over User,EXAI: Repeat until complete
    end
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant UI
    participant NextAuth
    participant DB
    
    User->>UI: Enter credentials
    UI->>NextAuth: POST /api/auth/signin
    NextAuth->>DB: Query user by email
    DB-->>NextAuth: User record
    NextAuth->>NextAuth: Verify password (bcrypt)
    
    alt Valid Credentials
        NextAuth->>DB: Create session
        DB-->>NextAuth: Session created
        NextAuth->>NextAuth: Generate JWT token
        NextAuth-->>UI: Return session + token
        UI->>UI: Store session
        UI-->>User: Redirect to dashboard
    else Invalid Credentials
        NextAuth-->>UI: Error: Invalid credentials
        UI-->>User: Show error message
    end
    
    Note over User,DB: Subsequent Requests
    
    User->>UI: Access protected route
    UI->>UI: Check session
    
    alt Session Valid
        UI->>NextAuth: Verify session
        NextAuth->>DB: Check session expiry
        DB-->>NextAuth: Session valid
        NextAuth-->>UI: Authorized
        UI-->>User: Show protected content
    else Session Invalid/Expired
        UI-->>User: Redirect to login
    end
```

---

## Adapter Pattern Architecture

```mermaid
classDiagram
    class IExaiAdapter {
        <<interface>>
        +executeChat(params) Promise~Response~
        +executeDebug(params) Promise~Response~
        +executeAnalyze(params) Promise~Response~
        +executeTool(tool, params) Promise~Response~
        +streamResponse(params) AsyncIterator
    }
    
    class IDatabaseAdapter {
        <<interface>>
        +createUser(data) Promise~User~
        +getUser(id) Promise~User~
        +createConversation(data) Promise~Conversation~
        +getConversations(userId) Promise~Conversation[]~
        +createMessage(data) Promise~Message~
        +getMessages(conversationId) Promise~Message[]~
        +createWorkflow(data) Promise~Workflow~
        +updateWorkflow(id, data) Promise~Workflow~
    }
    
    class LocalExaiAdapter {
        -daemonUrl: string
        -httpClient: HttpClient
        +executeChat(params) Promise~Response~
        +executeDebug(params) Promise~Response~
        +executeAnalyze(params) Promise~Response~
        +executeTool(tool, params) Promise~Response~
        +streamResponse(params) AsyncIterator
    }
    
    class SupabaseExaiAdapter {
        -supabaseClient: SupabaseClient
        -edgeFunctionUrl: string
        +executeChat(params) Promise~Response~
        +executeDebug(params) Promise~Response~
        +executeAnalyze(params) Promise~Response~
        +executeTool(tool, params) Promise~Response~
        +streamResponse(params) AsyncIterator
    }
    
    class LocalDatabaseAdapter {
        -prisma: PrismaClient
        +createUser(data) Promise~User~
        +getUser(id) Promise~User~
        +createConversation(data) Promise~Conversation~
        +getConversations(userId) Promise~User[]~
        +createMessage(data) Promise~Message~
        +getMessages(conversationId) Promise~Message[]~
        +createWorkflow(data) Promise~Workflow~
        +updateWorkflow(id, data) Promise~Workflow~
    }
    
    class SupabaseDatabaseAdapter {
        -supabase: SupabaseClient
        +createUser(data) Promise~User~
        +getUser(id) Promise~User~
        +createConversation(data) Promise~Conversation~
        +getConversations(userId) Promise~Conversation[]~
        +createMessage(data) Promise~Message~
        +getMessages(conversationId) Promise~Message[]~
        +createWorkflow(data) Promise~Workflow~
        +updateWorkflow(id, data) Promise~Workflow~
    }
    
    class AdapterFactory {
        +createExaiAdapter(mode) IExaiAdapter
        +createDatabaseAdapter(mode) IDatabaseAdapter
    }
    
    IExaiAdapter <|.. LocalExaiAdapter
    IExaiAdapter <|.. SupabaseExaiAdapter
    IDatabaseAdapter <|.. LocalDatabaseAdapter
    IDatabaseAdapter <|.. SupabaseDatabaseAdapter
    
    AdapterFactory ..> IExaiAdapter
    AdapterFactory ..> IDatabaseAdapter
    AdapterFactory ..> LocalExaiAdapter
    AdapterFactory ..> SupabaseExaiAdapter
    AdapterFactory ..> LocalDatabaseAdapter
    AdapterFactory ..> SupabaseDatabaseAdapter
```

---

## Implementation Phases

```mermaid
gantt
    title EXAI UI Implementation Timeline
    dateFormat YYYY-MM-DD
    section Phase 1: Foundation
    Database Schema Design           :p1t1, 2025-01-10, 1w
    Authentication System            :p1t2, after p1t1, 1w
    Backend API Structure            :p1t3, after p1t2, 1w
    EXAI Client Library              :p1t4, after p1t3, 1w
    
    section Phase 2: Core Features
    Enhanced Chat Interface          :p2t1, after p1t4, 1w
    Workflow Foundation              :p2t2, after p2t1, 1w
    Debug Tool Implementation        :p2t3, after p2t2, 1w
    Analyze Tool Implementation      :p2t4, after p2t3, 1w
    
    section Phase 3: Advanced Tools
    Code Review & Security Audit     :p3t1, after p2t4, 1w
    Documentation & Test Generation  :p3t2, after p3t1, 1w
    Planning & Consensus Tools       :p3t3, after p3t2, 1w
    Remaining Tools & Polish         :p3t4, after p3t3, 1w
    
    section Phase 4: Production
    User Experience & Settings       :p4t1, after p3t4, 1w
    Performance & Optimization       :p4t2, after p4t1, 1w
    Testing & Error Handling         :p4t3, after p4t2, 1w
    Documentation & Deployment       :p4t4, after p4t3, 1w
```

---

## Component Interaction Flow

```mermaid
graph TB
    subgraph "User Interaction"
        User[User Action]
    end
    
    subgraph "UI Layer"
        Component[React Component]
        Store[Zustand Store]
    end
    
    subgraph "API Layer"
        Route[API Route Handler]
        Middleware[Auth Middleware]
    end
    
    subgraph "Adapter Layer"
        Factory[Adapter Factory]
        ExaiAdapter[EXAI Adapter]
        DBAdapter[Database Adapter]
    end
    
    subgraph "External Services"
        EXAI[EXAI Daemon]
        DB[(Database)]
    end
    
    User --> Component
    Component --> Store
    Store --> Route
    Route --> Middleware
    Middleware --> Factory
    Factory --> ExaiAdapter
    Factory --> DBAdapter
    ExaiAdapter --> EXAI
    DBAdapter --> DB
    EXAI --> ExaiAdapter
    DB --> DBAdapter
    DBAdapter --> Route
    ExaiAdapter --> Route
    Route --> Store
    Store --> Component
    Component --> User
    
    style User fill:#e1f5ff
    style Component fill:#fff4e1
    style Factory fill:#e8f5e9
    style EXAI fill:#ffe0b2
    style DB fill:#f3e5f5
```

---

## Configuration-Based Adapter Selection

```mermaid
flowchart TD
    Start[Application Start] --> LoadEnv[Load Environment Variables]
    LoadEnv --> CheckMode{Check ADAPTER_MODE}
    
    CheckMode -->|local| LocalConfig[Local Configuration]
    CheckMode -->|supabase| SupabaseConfig[Supabase Configuration]
    
    LocalConfig --> CreateLocalExai[Create Local EXAI Adapter]
    LocalConfig --> CreateLocalDB[Create Local DB Adapter]
    
    SupabaseConfig --> CreateSupabaseExai[Create Supabase EXAI Adapter]
    SupabaseConfig --> CreateSupabaseDB[Create Supabase DB Adapter]
    
    CreateLocalExai --> RegisterExai[Register EXAI Adapter]
    CreateSupabaseExai --> RegisterExai
    
    CreateLocalDB --> RegisterDB[Register DB Adapter]
    CreateSupabaseDB --> RegisterDB
    
    RegisterExai --> Ready[Application Ready]
    RegisterDB --> Ready
    
    Ready --> APIRequest[API Request Received]
    APIRequest --> GetAdapter[Get Adapter from Factory]
    GetAdapter --> Execute[Execute Operation]
    Execute --> Response[Return Response]
    
    style Start fill:#e8f5e9
    style Ready fill:#c8e6c9
    style LocalConfig fill:#fff3e0
    style SupabaseConfig fill:#e1f5ff
```

---

This visual guide provides a comprehensive overview of the EXAI UI MCP architecture using Mermaid diagrams. All diagrams are interactive and can be rendered in any Markdown viewer that supports Mermaid.

