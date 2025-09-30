# EXAI Tools Integration

## Overview

EXAI provides 14+ specialized tools, each with unique workflows, parameters, and UI requirements. This document details the integration requirements for each tool.

## Tool Categories

### 1. Conversational Tools
- **chat** - General collaborative thinking
- **challenge** - Critical analysis

### 2. Investigation Tools
- **thinkdeep** - Multi-stage investigation
- **debug** - Root cause analysis
- **analyze** - Code analysis
- **tracer** - Code tracing

### 3. Quality Tools
- **codereview** - Code review workflow
- **precommit** - Pre-commit validation
- **secaudit** - Security audit
- **refactor** - Refactoring analysis

### 4. Generation Tools
- **docgen** - Documentation generation
- **testgen** - Test generation

### 5. Planning Tools
- **planner** - Sequential planning
- **consensus** - Multi-model consensus

## Common Tool Parameters

All EXAI tools share these common parameters:

```typescript
interface BaseToolParams {
  step: string                    // Current step description
  step_number: number             // Current step (1-based)
  total_steps: number             // Estimated total steps
  next_step_required: boolean     // Whether more steps needed
  findings: string                // Findings from this step
  
  // Optional common params
  continuation_id?: string        // For multi-turn conversations
  model?: string                  // Model to use
  temperature?: number            // Response creativity (0-1)
  use_websearch?: boolean         // Enable web search
  images?: string[]               // Image paths or base64
}
```

## Tool-Specific Requirements

### 1. Chat Tool

**Purpose:** General collaborative thinking and Q&A

**Parameters:**
```typescript
interface ChatParams {
  prompt: string                  // User's question/message
  files?: string[]                // File paths for context
  images?: string[]               // Image paths or base64
  model?: string                  // Model selection
  temperature?: number            // Creativity level
  thinking_mode?: ThinkingMode    // Depth of reasoning
  use_websearch?: boolean         // Enable web search
  continuation_id?: string        // Continue conversation
}

type ThinkingMode = 'minimal' | 'low' | 'medium' | 'high' | 'max'
```

**UI Requirements:**
- Simple chat interface (already exists)
- Model selector
- Temperature slider
- Thinking mode selector
- Web search toggle
- File/image upload
- Streaming response display

**Workflow:**
1. User enters message
2. Optional: attach files/images
3. Configure parameters
4. Send request
5. Display streaming response
6. Continue conversation with continuation_id

---

### 2. Debug Tool

**Purpose:** Systematic root cause analysis for bugs

**Parameters:**
```typescript
interface DebugParams extends BaseToolParams {
  hypothesis?: string             // Current theory about the issue
  confidence?: ConfidenceLevel    // Confidence in findings
  files_checked?: string[]        // Files examined
  relevant_files?: string[]       // Files relevant to issue
  relevant_context?: string[]     // Methods/functions involved
  issues_found?: Issue[]          // Issues identified
  backtrack_from_step?: number    // Revise from this step
}

type ConfidenceLevel = 'exploring' | 'low' | 'medium' | 'high' | 'very_high' | 'almost_certain' | 'certain'

interface Issue {
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
}
```

**UI Requirements:**
- Multi-step workflow interface
- Progress tracker (step X of Y)
- Hypothesis display
- Confidence meter
- File list with checkboxes
- Issue severity badges
- Backtrack button
- Expert analysis panel

**Workflow:**
1. User describes the bug (step 1)
2. Tool pauses for investigation
3. User investigates code, reports findings (step 2)
4. Repeat until confident
5. Tool provides expert analysis
6. Display root cause and fix

---

### 3. Analyze Tool

**Purpose:** Comprehensive code analysis

**Parameters:**
```typescript
interface AnalyzeParams extends BaseToolParams {
  analysis_type?: AnalysisType
  output_format?: OutputFormat
  confidence?: ConfidenceLevel
  files_checked?: string[]
  relevant_files?: string[]
  issues_found?: Issue[]
}

type AnalysisType = 'architecture' | 'performance' | 'security' | 'quality' | 'general'
type OutputFormat = 'summary' | 'detailed' | 'actionable'
```

**UI Requirements:**
- Analysis type selector
- Output format toggle
- File browser/selector
- Results dashboard with tabs:
  - Architecture insights
  - Performance metrics
  - Security concerns
  - Quality issues
- Export to markdown/PDF

**Workflow:**
1. Select analysis type
2. Choose files to analyze
3. Configure output format
4. Run analysis (multi-step)
5. Display comprehensive results
6. Export report

---

### 4. Code Review Tool

**Purpose:** Comprehensive code review

**Parameters:**
```typescript
interface CodeReviewParams extends BaseToolParams {
  review_type?: ReviewType
  severity_filter?: SeverityFilter
  standards?: string
  confidence?: ConfidenceLevel
  files_checked?: string[]
  relevant_files?: string[]
  issues_found?: Issue[]
}

type ReviewType = 'full' | 'security' | 'performance' | 'quick'
type SeverityFilter = 'critical' | 'high' | 'medium' | 'low' | 'all'
```

**UI Requirements:**
- Review type selector
- Severity filter
- Standards input (coding standards)
- File diff viewer
- Issue list with filtering
- Inline comments
- Approval/rejection workflow

---

### 5. Security Audit Tool

**Purpose:** Security vulnerability assessment

**Parameters:**
```typescript
interface SecAuditParams extends BaseToolParams {
  audit_focus?: AuditFocus
  threat_level?: ThreatLevel
  compliance_requirements?: string[]
  security_scope?: string
  confidence?: ConfidenceLevel
  files_checked?: string[]
  issues_found?: SecurityIssue[]
}

type AuditFocus = 'owasp' | 'compliance' | 'infrastructure' | 'dependencies' | 'comprehensive'
type ThreatLevel = 'low' | 'medium' | 'high' | 'critical'

interface SecurityIssue extends Issue {
  cwe_id?: string
  owasp_category?: string
  remediation?: string
}
```

**UI Requirements:**
- OWASP Top 10 checklist
- Threat level indicator
- Compliance framework selector
- Vulnerability scanner results
- CWE/CVE references
- Remediation guidance
- Security report export

---

### 6. Documentation Generator

**Purpose:** Automated documentation generation

**Parameters:**
```typescript
interface DocGenParams extends BaseToolParams {
  document_complexity?: boolean
  document_flow?: boolean
  update_existing?: boolean
  comments_on_complex_logic?: boolean
  num_files_documented?: number
  total_files_to_document?: number
}
```

**UI Requirements:**
- File selector (directory tree)
- Documentation options checkboxes
- Progress bar (files documented)
- Preview pane
- Diff viewer (before/after)
- Batch apply button

---

### 7. Test Generator

**Purpose:** Automated test generation

**Parameters:**
```typescript
interface TestGenParams extends BaseToolParams {
  confidence?: ConfidenceLevel
  files_checked?: string[]
  relevant_files?: string[]
}
```

**UI Requirements:**
- Test framework selector
- Coverage target slider
- File selector
- Test preview
- Coverage visualization
- Run tests button

---

### 8. Planner Tool

**Purpose:** Sequential task planning

**Parameters:**
```typescript
interface PlannerParams extends BaseToolParams {
  is_step_revision?: boolean
  revises_step_number?: number
  is_branch_point?: boolean
  branch_from_step?: number
  branch_id?: string
  more_steps_needed?: boolean
}
```

**UI Requirements:**
- Task tree visualization
- Branch visualization
- Step revision interface
- Drag-and-drop reordering
- Export to project management tools

---

### 9. Consensus Tool

**Purpose:** Multi-model consensus workflow

**Parameters:**
```typescript
interface ConsensusParams extends BaseToolParams {
  models: ModelConfig[]
  current_model_index?: number
  model_responses?: ModelResponse[]
  relevant_files?: string[]
}

interface ModelConfig {
  model: string
  stance?: 'for' | 'against' | 'neutral'
  stance_prompt?: string
}

interface ModelResponse {
  model: string
  stance: string
  response: string
  reasoning: string
}
```

**UI Requirements:**
- Model selector (multiple)
- Stance configuration
- Response comparison view
- Consensus visualization
- Voting/weighting interface

---

## Workflow State Management

### Continuation Handling

```typescript
interface ContinuationManager {
  // Store continuation ID for resuming workflows
  saveContinuation(conversationId: string, continuationId: string): void
  
  // Retrieve continuation ID
  getContinuation(conversationId: string): string | null
  
  // Clear continuation (workflow complete)
  clearContinuation(conversationId: string): void
}
```

### Progress Tracking

```typescript
interface WorkflowProgress {
  workflowId: string
  currentStep: number
  totalSteps: number
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed'
  progress: number  // 0-100
  estimatedTimeRemaining?: number  // seconds
}
```

### Step Management

```typescript
interface StepManager {
  // Add new step
  addStep(workflowId: string, step: WorkflowStep): void
  
  // Update existing step
  updateStep(workflowId: string, stepNumber: number, updates: Partial<WorkflowStep>): void
  
  // Backtrack to previous step
  backtrack(workflowId: string, stepNumber: number): void
  
  // Get all steps
  getSteps(workflowId: string): WorkflowStep[]
}
```

## UI Component Patterns

### Common Workflow UI

All workflow tools should share these UI patterns:

1. **Header**
   - Tool name and icon
   - Progress indicator
   - Status badge
   - Actions menu (save, export, share)

2. **Sidebar**
   - Step navigator
   - File browser
   - Settings panel

3. **Main Content**
   - Current step display
   - Input area
   - Results/findings area
   - Action buttons

4. **Footer**
   - Confidence indicator
   - Next/Previous buttons
   - Complete workflow button

### Streaming Response Display

```typescript
interface StreamingDisplay {
  // Append chunk to current message
  appendChunk(chunk: string): void
  
  // Mark message as complete
  finalizeMessage(): void
  
  // Show typing indicator
  showTypingIndicator(): void
  
  // Hide typing indicator
  hideTypingIndicator(): void
}
```

---

**Next Steps:** Review [Gap Analysis](./05-gap-analysis.md) to understand what needs to be built.

