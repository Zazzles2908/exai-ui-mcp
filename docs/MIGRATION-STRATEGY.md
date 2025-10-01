# EXAI UI MCP - Migration Strategy

## Overview

This document outlines the phased migration from the current adapter-based architecture to the new Supabase-First Hybrid architecture.

## Current Architecture (As-Is)

```
Next.js UI → Adapter Pattern → EXAI Daemon (local or Fly.io)
           → LocalExaiAdapter/SupabaseExaiAdapter
           → LocalDatabaseAdapter/SupabaseDatabaseAdapter
           → PostgreSQL/Supabase
```

## Target Architecture (To-Be)

```
Next.js UI → Supabase Edge Functions (Gateway) → EXAI Daemon (Fly.io HTTP)
           → Supabase (Auth, Database, Storage, Realtime)
```

---

## Migration Phases

### Phase 1: Add HTTP Endpoint to EXAI Daemon (Week 1)

**Goal:** Extend EXAI daemon to support HTTP requests alongside WebSocket

**Tasks:**
1. Create `src/daemon/http_server.py`
2. Implement `/execute` endpoint for tool execution
3. Implement `/health` endpoint for health checks
4. Add Bearer token authentication
5. Maintain backward compatibility with WebSocket
6. Test locally with curl/Postman
7. Deploy to Fly.io
8. Verify HTTPS access

**Deliverables:**
- ✅ HTTP server running on port 8080
- ✅ `/execute` endpoint accepts tool requests
- ✅ `/health` endpoint returns status
- ✅ WebSocket server still functional
- ✅ Deployed to Fly.io with HTTPS

**Testing:**
```bash
# Health check
curl https://exai-daemon-prod.fly.dev/health

# Execute tool
curl -X POST https://exai-daemon-prod.fly.dev/execute \
  -H "Authorization: Bearer ${EXAI_WS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "chat",
    "params": {"prompt": "Hello!"},
    "user_id": "test-user",
    "conversation_id": "test-conv"
  }'
```

---

### Phase 2: Create Supabase Edge Functions Gateway (Week 2)

**Goal:** Create Edge Function to act as secure gateway between UI and EXAI daemon

**Tasks:**
1. Create `supabase/functions/exai-gateway/index.ts`
2. Implement Supabase Auth validation
3. Implement request forwarding to EXAI daemon
4. Implement response storage in Supabase Database
5. Add error handling and logging
6. Test locally with Supabase CLI
7. Deploy to Supabase
8. Configure environment variables

**Deliverables:**
- ✅ Edge Function deployed to Supabase
- ✅ Auth validation working
- ✅ Request forwarding to EXAI daemon
- ✅ Responses stored in database
- ✅ Realtime notifications triggered

**Testing:**
```bash
# Test Edge Function locally
supabase functions serve exai-gateway

# Test with curl
curl -X POST http://localhost:54321/functions/v1/exai-gateway \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "chat",
    "params": {"prompt": "Hello!"}
  }'
```

---

### Phase 3: Update Next.js UI to Use Edge Functions (Week 3)

**Goal:** Replace adapter pattern with new ExaiClient that calls Edge Functions

**Tasks:**
1. Create `app/lib/exai-client.ts`
2. Implement `ExaiClient` class
3. Add methods for all 14+ tools
4. Remove `AdapterFactory` and adapter implementations
5. Update all tool invocation code
6. Update API routes to use ExaiClient
7. Test all tools end-to-end
8. Update error handling

**Deliverables:**
- ✅ ExaiClient class implemented
- ✅ All 14+ tools working
- ✅ Adapter pattern removed
- ✅ API routes updated
- ✅ Error handling improved

**Code Changes:**
```typescript
// Before (Adapter Pattern)
const exaiAdapter = AdapterFactory.getExaiAdapter()
const result = await exaiAdapter.executeChat(params)

// After (ExaiClient)
const exaiClient = new ExaiClient()
const result = await exaiClient.executeChat(params)
```

---

### Phase 4: Implement Realtime Progress Updates (Week 4)

**Goal:** Add real-time progress notifications for long-running workflows

**Tasks:**
1. Add progress tracking to EXAI daemon
2. Modify Edge Function to update conversation during execution
3. Implement Realtime subscriptions in Next.js UI
4. Add progress indicators to UI components
5. Test with long-running workflow tools
6. Optimize for performance

**Deliverables:**
- ✅ Progress tracking in EXAI daemon
- ✅ Realtime subscriptions in UI
- ✅ Progress indicators displayed
- ✅ Smooth user experience

**UI Changes:**
```typescript
// Subscribe to conversation updates
const channel = supabase
  .channel(`conversation-${conversationId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'exai_conversations',
    filter: `id=eq.${conversationId}`
  }, (payload) => {
    // Update UI with progress
    setProgress(payload.new.progress)
  })
  .subscribe()
```

---

### Phase 5: Optimize and Deploy to Production (Week 5)

**Goal:** Performance testing, security audit, and production deployment

**Tasks:**
1. Performance testing (load testing, latency measurement)
2. Security audit (RLS policies, Edge Function auth, EXAI daemon security)
3. Documentation updates (README, API docs, deployment guide)
4. Production deployment (Vercel, Supabase, Fly.io)
5. User acceptance testing
6. Monitoring and alerting setup

**Deliverables:**
- ✅ Performance benchmarks documented
- ✅ Security audit completed
- ✅ Documentation updated
- ✅ Production deployment successful
- ✅ Monitoring configured

---

## Migration Checklist

### Week 1: EXAI Daemon HTTP Endpoint
- [ ] Create `src/daemon/http_server.py`
- [ ] Implement `/execute` endpoint
- [ ] Implement `/health` endpoint
- [ ] Add Bearer token authentication
- [ ] Test locally
- [ ] Deploy to Fly.io
- [ ] Verify HTTPS access
- [ ] Update Fly.io configuration

### Week 2: Supabase Edge Functions
- [ ] Create `supabase/functions/exai-gateway/index.ts`
- [ ] Implement auth validation
- [ ] Implement request forwarding
- [ ] Implement response storage
- [ ] Add error handling
- [ ] Test locally with Supabase CLI
- [ ] Deploy to Supabase
- [ ] Configure environment variables

### Week 3: Next.js UI Updates
- [ ] Create `app/lib/exai-client.ts`
- [ ] Implement ExaiClient class
- [ ] Add methods for all 14+ tools
- [ ] Remove AdapterFactory
- [ ] Remove adapter implementations
- [ ] Update API routes
- [ ] Test all tools
- [ ] Update error handling

### Week 4: Realtime Integration
- [ ] Add progress tracking to EXAI daemon
- [ ] Modify Edge Function for progress updates
- [ ] Implement Realtime subscriptions
- [ ] Add progress indicators to UI
- [ ] Test with long-running workflows
- [ ] Optimize performance

### Week 5: Production Deployment
- [ ] Performance testing
- [ ] Security audit
- [ ] Documentation updates
- [ ] Production deployment
- [ ] User acceptance testing
- [ ] Monitoring setup

---

## Rollback Plan

Each phase has a clear rollback point:

**Phase 1 Rollback:**
- Keep WebSocket server running
- Remove HTTP endpoints
- No impact on existing functionality

**Phase 2 Rollback:**
- Delete Edge Function
- Continue using adapter pattern
- No database changes needed

**Phase 3 Rollback:**
- Restore adapter pattern code
- Revert API route changes
- No data loss

**Phase 4 Rollback:**
- Disable Realtime subscriptions
- Remove progress tracking
- Functionality still works without real-time updates

**Phase 5 Rollback:**
- Rollback Vercel deployment
- Rollback Supabase Edge Functions
- Keep EXAI daemon running

---

## Risk Mitigation

### Risk 1: EXAI Daemon Downtime
**Mitigation:** Deploy HTTP endpoint alongside WebSocket, test thoroughly before switching

### Risk 2: Edge Function Failures
**Mitigation:** Implement comprehensive error handling, logging, and monitoring

### Risk 3: Database Migration Issues
**Mitigation:** No schema changes needed, only new records created

### Risk 4: Performance Degradation
**Mitigation:** Performance testing in Phase 5, optimize before production

### Risk 5: User Disruption
**Mitigation:** Phased rollout, backward compatibility, clear rollback points

---

## Success Criteria

### Phase 1 Success
- ✅ HTTP endpoint responds to requests
- ✅ Health check returns 200 OK
- ✅ WebSocket still functional
- ✅ Deployed to Fly.io

### Phase 2 Success
- ✅ Edge Function deployed
- ✅ Auth validation working
- ✅ Requests forwarded to EXAI daemon
- ✅ Responses stored in database

### Phase 3 Success
- ✅ All 14+ tools working
- ✅ Adapter pattern removed
- ✅ No regressions in functionality

### Phase 4 Success
- ✅ Real-time updates working
- ✅ Progress indicators displayed
- ✅ Smooth user experience

### Phase 5 Success
- ✅ Production deployment successful
- ✅ Performance meets benchmarks
- ✅ Security audit passed
- ✅ Users satisfied

---

## Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1 | 1 week | Week 1 | Week 1 |
| Phase 2 | 1 week | Week 2 | Week 2 |
| Phase 3 | 1 week | Week 3 | Week 3 |
| Phase 4 | 1 week | Week 4 | Week 4 |
| Phase 5 | 1 week | Week 5 | Week 5 |
| **Total** | **5 weeks** | | |

**Additional Time:**
- Testing: 1 week
- Documentation: 1 week
- **Grand Total: 7 weeks**

---

## Resources Required

### Development
- 1 Full-stack developer (7 weeks)
- Access to Supabase Pro account
- Access to Fly.io account
- Access to EXAI daemon source code

### Infrastructure
- Supabase Pro: $25/month
- Fly.io: $5-30/month
- Vercel Pro (optional): $20/month

### Tools
- Supabase CLI
- Fly.io CLI
- Vercel CLI
- Git/GitHub
- VS Code or preferred IDE

---

## Next Steps

1. Review and approve migration strategy
2. Set up development environment
3. Begin Phase 1 implementation
4. Schedule weekly progress reviews
5. Prepare rollback procedures

**Ready to begin migration!** 🚀

