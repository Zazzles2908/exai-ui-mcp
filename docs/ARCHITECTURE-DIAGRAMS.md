# EXAI UI MCP - Architecture Diagrams

**Version:** 2.0 - Supabase-First Hybrid  
**Last Updated:** 2025-10-01

This document provides comprehensive Mermaid diagrams for the new Supabase-First Hybrid architecture.

---

## 1. System Architecture Overview

```mermaid
graph TB
    subgraph "User Browser"
        UI[Next.js App<br/>React + TypeScript<br/>Tailwind CSS]
    end
    
    subgraph "Supabase Cloud Platform"
        AUTH[Supabase Auth<br/>User Management<br/>Session Handling]
        DB[(PostgreSQL 17<br/>Conversations<br/>Messages<br/>Workflows)]
        STORAGE[Supabase Storage<br/>File Uploads<br/>Attachments]
        REALTIME[Supabase Realtime<br/>Postgres CDC<br/>Progress Updates]
        EDGE[Edge Functions<br/>Gateway Layer<br/>Deno Runtime]
    end
    
    subgraph "External Hosting - Fly.io"
        HTTP[HTTP Server<br/>aiohttp<br/>Port 8080]
        WS[WebSocket Server<br/>Port 8765<br/>Backward Compat]
        REGISTRY[Provider Registry<br/>Singleton Pattern<br/>Health Monitoring]
        TOOLS[EXAI Tools<br/>14+ Specialized Tools<br/>Simple + Workflow]
    end
    
    subgraph "AI Provider APIs"
        KIMI[Kimi API<br/>api.moonshot.ai<br/>Moonshot Models]
        GLM[GLM API<br/>api.z.ai<br/>ZhipuAI Models]
    end
    
    UI -->|HTTPS| AUTH
    UI -->|HTTPS| EDGE
    UI -->|WebSocket| REALTIME
    
    EDGE -->|Validate| AUTH
    EDGE -->|Store| DB
    EDGE -->|Upload| STORAGE
    EDGE -->|Forward| HTTP
    
    HTTP --> REGISTRY
    WS --> REGISTRY
    REGISTRY --> TOOLS
    
    TOOLS -->|HTTPS| KIMI
    TOOLS -->|HTTPS| GLM
    
    HTTP -->|Store Results| DB
    DB -->|Notify| REALTIME
    REALTIME -->|Push| UI
```

---

## 2. Request Flow Sequence

```mermaid
sequenceDiagram
    participant User
    participant UI as Next.js UI
    participant Edge as Edge Function
    participant Auth as Supabase Auth
    participant DB as Supabase DB
    participant EXAI as EXAI Daemon
    participant Registry as Provider Registry
    participant AI as AI Provider API

    User->>UI: Click "Analyze Code"
    UI->>Edge: POST /exai-gateway<br/>{tool, params}
    
    Edge->>Auth: Verify session token
    Auth-->>Edge: User authenticated ✓
    
    Edge->>DB: INSERT conversation
    DB-->>Edge: conversation_id
    
    Edge->>DB: INSERT user message
    
    Edge->>EXAI: POST /execute<br/>{tool, params, user_id, conversation_id}
    
    EXAI->>Registry: Select provider
    Registry-->>EXAI: Provider instance
    
    EXAI->>AI: Call AI API
    AI-->>EXAI: AI response
    
    EXAI-->>Edge: Tool result
    
    Edge->>DB: INSERT assistant message
    Edge->>DB: UPDATE conversation
    
    DB->>UI: Realtime notification
    UI->>User: Display results
```

---

## 3. EXAI Daemon Architecture

```mermaid
graph TB
    subgraph "EXAI Python Daemon - Fly.io"
        HTTP_SERVER[HTTP Server<br/>aiohttp<br/>Port 8080]
        WS_SERVER[WebSocket Server<br/>websockets<br/>Port 8765]
        
        subgraph "Core Infrastructure"
            REGISTRY[Provider Registry<br/>Singleton]
            HEALTH[Health Monitor<br/>Circuit Breaker]
            CONCURRENCY[Concurrency Control<br/>Bounded Semaphores]
        end
        
        subgraph "Simple Tools"
            CHAT[chat]
            LISTMODELS[listmodels]
            VERSION[version]
        end
        
        subgraph "Workflow Tools"
            ANALYZE[analyze]
            DEBUG[debug]
            THINKDEEP[thinkdeep]
            CODEREVIEW[codereview]
            SECAUDIT[secaudit]
            DOCGEN[docgen]
            TESTGEN[testgen]
            PLANNER[planner]
            CONSENSUS[consensus]
            PRECOMMIT[precommit]
            REFACTOR[refactor]
            TRACER[tracer]
        end
        
        subgraph "Provider Implementations"
            KIMI_PROVIDER[Kimi Provider]
            GLM_PROVIDER[GLM Provider]
            CUSTOM_PROVIDER[Custom Provider]
        end
    end
    
    HTTP_SERVER --> REGISTRY
    WS_SERVER --> REGISTRY
    
    REGISTRY --> HEALTH
    REGISTRY --> CONCURRENCY
    
    REGISTRY --> CHAT
    REGISTRY --> LISTMODELS
    REGISTRY --> VERSION
    
    REGISTRY --> ANALYZE
    REGISTRY --> DEBUG
    REGISTRY --> THINKDEEP
    REGISTRY --> CODEREVIEW
    REGISTRY --> SECAUDIT
    REGISTRY --> DOCGEN
    REGISTRY --> TESTGEN
    REGISTRY --> PLANNER
    REGISTRY --> CONSENSUS
    REGISTRY --> PRECOMMIT
    REGISTRY --> REFACTOR
    REGISTRY --> TRACER
    
    HEALTH --> KIMI_PROVIDER
    HEALTH --> GLM_PROVIDER
    HEALTH --> CUSTOM_PROVIDER
```

---

## 4. Database Schema

```mermaid
erDiagram
    USER ||--o{ CONVERSATION : creates
    USER ||--o{ FILE : uploads
    USER ||--o{ USER_SETTINGS : has
    USER ||--o{ SESSION : has
    
    CONVERSATION ||--o{ MESSAGE : contains
    CONVERSATION ||--o{ WORKFLOW : has
    CONVERSATION ||--o{ FILE : references
    
    WORKFLOW ||--o{ WORKFLOW_STEP : contains
    
    MESSAGE ||--o{ MESSAGE_ATTACHMENT : has
    FILE ||--o{ MESSAGE_ATTACHMENT : referenced_by
    
    USER {
        uuid id PK
        string email UK
        string name
        string password
        enum role
        timestamp created_at
        timestamp updated_at
    }
    
    CONVERSATION {
        uuid id PK
        uuid user_id FK
        string title
        string tool_type
        timestamp created_at
        timestamp updated_at
    }
    
    MESSAGE {
        uuid id PK
        uuid conversation_id FK
        enum role
        text content
        jsonb metadata
        timestamp created_at
    }
    
    WORKFLOW {
        uuid id PK
        uuid conversation_id FK
        string tool_type
        enum status
        int current_step
        int total_steps
        string continuation_id
        jsonb result
        timestamp created_at
        timestamp updated_at
    }
    
    WORKFLOW_STEP {
        uuid id PK
        uuid workflow_id FK
        int step_number
        text findings
        text hypothesis
        enum confidence
        enum status
        jsonb metadata
        timestamp created_at
    }
    
    FILE {
        uuid id PK
        uuid user_id FK
        uuid conversation_id FK
        uuid workflow_step_id FK
        string name
        int size
        string type
        string url
        timestamp created_at
    }
    
    USER_SETTINGS {
        uuid id PK
        uuid user_id FK UK
        string default_model
        string default_thinking_mode
        boolean web_search_enabled
        string theme
        jsonb preferences
    }
    
    SESSION {
        uuid id PK
        string session_token UK
        uuid user_id FK
        timestamp expires
    }
    
    MESSAGE_ATTACHMENT {
        uuid id PK
        uuid message_id FK
        uuid file_id FK
    }
```

---

## 5. Edge Function Gateway Flow

```mermaid
flowchart TD
    START([Request Received]) --> AUTH{Verify<br/>Auth Token}
    AUTH -->|Invalid| UNAUTH[Return 401<br/>Unauthorized]
    AUTH -->|Valid| PARSE[Parse Request<br/>tool, params]
    
    PARSE --> CREATE_CONV[Create Conversation<br/>in Database]
    CREATE_CONV --> CREATE_MSG[Create User Message<br/>in Database]
    
    CREATE_MSG --> FORWARD[Forward to<br/>EXAI Daemon]
    FORWARD --> WAIT{EXAI<br/>Response}
    
    WAIT -->|Error| ERROR[Return 500<br/>Error Response]
    WAIT -->|Success| STORE[Store Assistant Message<br/>in Database]
    
    STORE --> UPDATE[Update Conversation<br/>Timestamp]
    UPDATE --> NOTIFY[Trigger Realtime<br/>Notification]
    
    NOTIFY --> RETURN[Return Result<br/>to Client]
    RETURN --> END([End])
    
    UNAUTH --> END
    ERROR --> END
```

---

## 6. Realtime Progress Updates

```mermaid
sequenceDiagram
    participant UI as Next.js UI
    participant Realtime as Supabase Realtime
    participant DB as PostgreSQL
    participant Edge as Edge Function
    participant EXAI as EXAI Daemon

    UI->>Realtime: Subscribe to conversation
    Realtime-->>UI: Subscription confirmed
    
    UI->>Edge: Start workflow tool
    Edge->>EXAI: Execute tool
    
    loop Every 8 seconds
        EXAI->>DB: UPDATE conversation<br/>SET progress = X
        DB->>Realtime: Postgres CDC event
        Realtime->>UI: Push progress update
        UI->>UI: Update progress bar
    end
    
    EXAI-->>Edge: Tool complete
    Edge->>DB: INSERT final message
    DB->>Realtime: Postgres CDC event
    Realtime->>UI: Push completion
    UI->>UI: Display results
```

---

## 7. Provider Selection Flow

```mermaid
flowchart TD
    START([Tool Execution]) --> CHECK_MODEL{Model<br/>Specified?}
    
    CHECK_MODEL -->|Yes| GET_PROVIDER[Get Specific Provider]
    CHECK_MODEL -->|No| AUTO_SELECT[Auto-Select Provider]
    
    AUTO_SELECT --> PRIORITY[Check Priority Order<br/>Kimi → GLM → Custom]
    PRIORITY --> HEALTH{Provider<br/>Healthy?}
    
    HEALTH -->|Yes| USE[Use Provider]
    HEALTH -->|No| NEXT[Try Next Provider]
    NEXT --> PRIORITY
    
    GET_PROVIDER --> SPECIFIC_HEALTH{Provider<br/>Healthy?}
    SPECIFIC_HEALTH -->|Yes| USE
    SPECIFIC_HEALTH -->|No| FALLBACK[Use Fallback Chain]
    FALLBACK --> PRIORITY
    
    USE --> CALL[Call AI API]
    CALL --> SUCCESS{API<br/>Success?}
    
    SUCCESS -->|Yes| RETURN[Return Response]
    SUCCESS -->|No| CIRCUIT{Circuit<br/>Breaker?}
    
    CIRCUIT -->|Open| NEXT
    CIRCUIT -->|Closed| RETRY[Retry with<br/>Exponential Backoff]
    RETRY --> CALL
    
    RETURN --> END([End])
```

---

## 8. Deployment Architecture

```mermaid
graph TB
    subgraph "Production Environment"
        subgraph "Vercel"
            NEXTJS[Next.js App<br/>SSR + Static]
        end
        
        subgraph "Supabase Cloud"
            SUPA_AUTH[Auth]
            SUPA_DB[(Database)]
            SUPA_STORAGE[Storage]
            SUPA_REALTIME[Realtime]
            SUPA_EDGE[Edge Functions]
        end
        
        subgraph "Fly.io"
            EXAI_DAEMON[EXAI Daemon<br/>Python]
        end
        
        subgraph "External APIs"
            KIMI_API[Kimi API]
            GLM_API[GLM API]
        end
    end
    
    USERS[Users] -->|HTTPS| NEXTJS
    NEXTJS -->|HTTPS| SUPA_AUTH
    NEXTJS -->|HTTPS| SUPA_EDGE
    NEXTJS -->|WebSocket| SUPA_REALTIME
    
    SUPA_EDGE -->|HTTPS| EXAI_DAEMON
    SUPA_EDGE -->|SQL| SUPA_DB
    SUPA_EDGE -->|API| SUPA_STORAGE
    
    EXAI_DAEMON -->|SQL| SUPA_DB
    EXAI_DAEMON -->|HTTPS| KIMI_API
    EXAI_DAEMON -->|HTTPS| GLM_API
    
    SUPA_DB -->|CDC| SUPA_REALTIME
```

---

## 9. Security Architecture

```mermaid
graph TB
    subgraph "Security Layers"
        subgraph "Layer 1: Authentication"
            USER_AUTH[User Authentication<br/>Supabase Auth]
            SESSION[Session Management<br/>JWT Tokens]
        end
        
        subgraph "Layer 2: Authorization"
            RLS[Row Level Security<br/>PostgreSQL RLS]
            EDGE_AUTH[Edge Function Auth<br/>Token Validation]
        end
        
        subgraph "Layer 3: Data Protection"
            ENCRYPTION[Data Encryption<br/>At Rest + In Transit]
            SIGNED_URLS[Signed URLs<br/>File Access]
        end
        
        subgraph "Layer 4: API Security"
            RATE_LIMIT[Rate Limiting<br/>Concurrency Control]
            BEARER_TOKEN[Bearer Token<br/>EXAI Daemon Auth]
        end
    end
    
    USER_AUTH --> SESSION
    SESSION --> RLS
    SESSION --> EDGE_AUTH
    
    RLS --> ENCRYPTION
    EDGE_AUTH --> BEARER_TOKEN
    
    ENCRYPTION --> SIGNED_URLS
    BEARER_TOKEN --> RATE_LIMIT
```

---

## 10. Migration Phases

```mermaid
gantt
    title Migration Timeline (7 Weeks)
    dateFormat YYYY-MM-DD
    section Phase 1
    Add HTTP Endpoint to EXAI Daemon :p1, 2025-10-01, 7d
    section Phase 2
    Create Supabase Edge Functions :p2, after p1, 7d
    section Phase 3
    Update Next.js UI :p3, after p2, 7d
    section Phase 4
    Implement Realtime Updates :p4, after p3, 7d
    section Phase 5
    Optimize and Deploy :p5, after p4, 7d
    section Testing
    Integration Testing :t1, after p5, 7d
    section Documentation
    Update Documentation :d1, after t1, 7d
```

---

**For detailed implementation guidance, see:**
- [Supabase-Native Architecture](./SUPABASE-NATIVE-ARCHITECTURE.md)
- [Migration Strategy](./MIGRATION-STRATEGY.md)
- [Deployment Guide](./DEPLOYMENT-GUIDE.md)

