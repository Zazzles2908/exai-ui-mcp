# EXAI UI MCP - Architecture Investigation Summary

**Date:** 2025-10-01  
**Investigation Method:** EXAI thinkdeep tool (4-step systematic analysis)  
**Confidence Level:** VERY HIGH

---

## Executive Summary

After comprehensive investigation using EXAI's thinkdeep tool, we have determined that a **pure Supabase-native implementation is NOT FEASIBLE** for the EXAI UI MCP project. Instead, we recommend a **"Supabase-First Hybrid" architecture** that maximizes Supabase integration while preserving the existing EXAI Python codebase.

---

## Investigation Process

### Step 1: Analyze EXAI System Architecture
**Findings:**
- EXAI is a Python-based WebSocket daemon (2000+ lines of code)
- Uses async I/O (asyncio, websockets library)
- Implements provider registry pattern with health monitoring
- Supports 14+ specialized tools (simple + workflow types)
- Requires stateful singleton pattern for provider management
- Needs bounded concurrency control (24 global, 8 per-session)

**Critical Constraint:** Python runtime requirement

### Step 2: Evaluate Supabase Capabilities
**Findings:**
- Edge Functions: Deno runtime (TypeScript/JavaScript ONLY)
- Execution limit: 150 seconds (may be insufficient for workflows)
- No WebSocket server support (Realtime is pub/sub only)
- Stateless execution (no shared memory between invocations)
- No built-in concurrency control mechanisms

**Critical Incompatibility:** Cannot run Python code in Edge Functions

### Step 3: Design Optimal Architecture
**Solution:** Supabase-First Hybrid
- **Supabase:** Auth, Database, Storage, Realtime, Edge Functions (gateway)
- **Fly.io:** EXAI Python daemon (HTTP + WebSocket)
- **Data Flow:** UI → Edge Function → EXAI Daemon → AI APIs

**Benefits:**
- Preserves EXAI Python codebase (no rewrite)
- Maximizes Supabase integration
- Minimal external hosting (single Python service)
- Maintains all EXAI capabilities

### Step 4: Create Migration Strategy
**Approach:** Phased, incremental migration over 5 weeks
- Week 1: Add HTTP endpoint to EXAI daemon
- Week 2: Create Supabase Edge Functions gateway
- Week 3: Update Next.js UI to use Edge Functions
- Week 4: Implement Realtime progress updates
- Week 5: Optimize and deploy to production

**Timeline:** 7 weeks total (5 dev + 1 test + 1 docs)

---

## Key Findings

### What We Learned

1. **Python vs. TypeScript Runtime**
   - Supabase Edge Functions run on Deno (TypeScript/JavaScript)
   - EXAI is written in Python with complex async patterns
   - **Conclusion:** Rewriting 2000+ lines of Python to TypeScript is too risky and expensive

2. **WebSocket Requirements**
   - EXAI uses full WebSocket server (RFC 6455) with JSON-RPC 2.0
   - Supabase Realtime is pub/sub only, not a full WebSocket server
   - **Conclusion:** Cannot replace WebSocket daemon with Realtime

3. **Stateful Provider Registry**
   - EXAI uses singleton pattern with shared state (circuit breaker, health monitoring)
   - Edge Functions are stateless with no shared memory
   - **Conclusion:** Cannot implement provider registry in Edge Functions

4. **Execution Time Limits**
   - EXAI workflow tools can run for minutes (complex analysis, debugging)
   - Edge Functions have 150-second limit
   - **Conclusion:** May be insufficient for complex workflows

5. **Concurrency Control**
   - EXAI uses bounded semaphores (24 global, 8 per-session, 6 Kimi, 4 GLM)
   - Supabase has no built-in rate limiting/semaphore mechanisms
   - **Conclusion:** Requires custom implementation in EXAI daemon

### What We Recommend

**Architecture:** Supabase-First Hybrid

```
User → Next.js (Vercel)
     → Supabase (Auth, DB, Storage, Realtime, Edge Functions)
     → EXAI Daemon (Fly.io - Python HTTP server)
     → AI Provider APIs (Kimi, GLM)
```

**Why This Works:**
- ✅ Users interact with Supabase-hosted web app
- ✅ Supabase handles auth, database, storage, realtime
- ✅ Edge Functions act as secure gateway
- ✅ EXAI Python daemon preserved (no rewrite)
- ✅ Minimal external hosting (single Python service)
- ✅ All EXAI capabilities maintained

---

## Alternatives Considered

### Option A: Full TypeScript Rewrite
**Verdict:** REJECTED
- ❌ 2000+ lines of Python to rewrite
- ❌ 3-6 months development time
- ❌ High risk of bugs
- ❌ Loss of existing EXAI ecosystem
- ❌ May still hit 150-second Edge Function limit

### Option B: AWS Lambda for Python
**Verdict:** POSSIBLE but not preferred
- ⚠️ Cold start latency (1-5 seconds)
- ⚠️ 15-minute execution limit
- ⚠️ More complex deployment
- ⚠️ Higher cost at scale
- ✅ Fly.io is simpler and more cost-effective

### Option C: Wait for Python Edge Functions
**Verdict:** NOT VIABLE
- ❌ Not currently available in Supabase
- ❌ No timeline for Python support
- ❌ Uncertain if it will ever happen

---

## Recommended Architecture Details

### Component Responsibilities

| Component | Responsibilities | Technology |
|-----------|-----------------|------------|
| **Next.js UI** | User interface, interaction, display | React, TypeScript, Tailwind |
| **Supabase Auth** | User authentication, session management | Supabase Auth |
| **Supabase Database** | Persist conversations, messages, workflows | PostgreSQL 17 |
| **Supabase Storage** | Store uploaded files, attachments | Supabase Storage |
| **Supabase Realtime** | Push progress updates to UI | Postgres CDC |
| **Edge Functions** | Gateway, auth validation, request routing | Deno, TypeScript |
| **EXAI Daemon** | Tool execution, provider management | Python, aiohttp |
| **Provider Registry** | Health monitoring, provider selection | Python, singleton |
| **EXAI Tools** | 14+ specialized AI workflows | Python, async |

### Data Flow

1. User clicks "Analyze Code" in Next.js UI
2. Supabase Auth verifies user session
3. Edge Function validates request and creates conversation record
4. Edge Function forwards request to EXAI daemon (HTTP)
5. EXAI daemon executes tool, calls AI provider APIs
6. EXAI daemon returns results to Edge Function
7. Edge Function stores results in Supabase Database
8. Supabase Realtime pushes updates to UI
9. Next.js UI displays results

### Security Layers

1. **Authentication:** Supabase Auth with JWT tokens
2. **Authorization:** PostgreSQL RLS policies
3. **Gateway:** Edge Functions validate all requests
4. **EXAI Daemon:** Bearer token authentication
5. **Data Protection:** Encryption at rest and in transit
6. **File Access:** Signed URLs for storage

---

## Migration Strategy

### Phase 1: Add HTTP Endpoint to EXAI Daemon (Week 1)
- Create `src/daemon/http_server.py`
- Implement `/execute` and `/health` endpoints
- Maintain backward compatibility with WebSocket
- Deploy to Fly.io

### Phase 2: Create Supabase Edge Functions Gateway (Week 2)
- Create `supabase/functions/exai-gateway/index.ts`
- Implement auth validation, request forwarding, response storage
- Deploy to Supabase

### Phase 3: Update Next.js UI (Week 3)
- Create `ExaiClient` class
- Remove adapter pattern
- Update all tool invocations

### Phase 4: Implement Realtime Updates (Week 4)
- Add progress tracking to EXAI daemon
- Implement Realtime subscriptions in UI
- Display progress indicators

### Phase 5: Optimize and Deploy (Week 5)
- Performance testing
- Security audit
- Documentation updates
- Production deployment

**Total Timeline:** 7 weeks (5 dev + 1 test + 1 docs)

---

## Cost Analysis

### Monthly Costs

| Service | Cost | Notes |
|---------|------|-------|
| Supabase Pro | $25 | Database, Auth, Storage, Realtime, Edge Functions |
| Fly.io | $5-30 | EXAI Python daemon (shared CPU) |
| Vercel Pro | $20 | Optional (Hobby plan is free) |
| **Total** | **$30-75** | Depending on usage and plan selection |

### Development Costs

| Phase | Effort | Cost (at $100/hr) |
|-------|--------|-------------------|
| Development | 5 weeks | $20,000 |
| Testing | 1 week | $4,000 |
| Documentation | 1 week | $4,000 |
| **Total** | **7 weeks** | **$28,000** |

---

## Success Criteria

### Technical Success
- ✅ All 14+ EXAI tools working
- ✅ Real-time progress updates functional
- ✅ Sub-second response times for simple tools
- ✅ Workflow tools complete successfully
- ✅ No data loss or corruption
- ✅ Security audit passed

### User Experience Success
- ✅ Users can log in and access EXAI tools
- ✅ No local daemon setup required
- ✅ Smooth, responsive UI
- ✅ Clear progress indicators
- ✅ Persistent conversation history

### Operational Success
- ✅ 99.9% uptime
- ✅ Automated deployments
- ✅ Monitoring and alerting configured
- ✅ Clear rollback procedures
- ✅ Documentation complete

---

## Risks and Mitigation

### Risk 1: EXAI Daemon Downtime
**Mitigation:** Deploy HTTP endpoint alongside WebSocket, test thoroughly before switching

### Risk 2: Edge Function Failures
**Mitigation:** Comprehensive error handling, logging, and monitoring

### Risk 3: Performance Degradation
**Mitigation:** Performance testing in Phase 5, optimize before production

### Risk 4: User Disruption
**Mitigation:** Phased rollout, backward compatibility, clear rollback points

---

## Conclusion

The **Supabase-First Hybrid architecture** is the optimal solution for EXAI UI MCP because it:

1. **Preserves Value:** Keeps existing EXAI Python codebase intact
2. **Maximizes Integration:** Uses Supabase for auth, database, storage, realtime
3. **Minimizes Hosting:** Single external Python service on Fly.io
4. **Maintains Capabilities:** All 14+ EXAI tools work as expected
5. **Provides Path Forward:** Can incrementally migrate tools to TypeScript over time

**Recommendation:** Proceed with Supabase-First Hybrid architecture and 7-week migration plan.

---

## Next Steps

1. ✅ Review and approve architecture
2. ⏳ Set up development environment
3. ⏳ Begin Phase 1 implementation
4. ⏳ Schedule weekly progress reviews
5. ⏳ Prepare rollback procedures

**Ready to begin!** 🚀

---

## References

- [Supabase-Native Architecture](./SUPABASE-NATIVE-ARCHITECTURE.md)
- [Migration Strategy](./MIGRATION-STRATEGY.md)
- [Architecture Diagrams](./ARCHITECTURE-DIAGRAMS.md)
- [EXAI System Overview](../exai_architecture/system-overview.md)
- [Deployment Guide](./DEPLOYMENT-GUIDE.md)

