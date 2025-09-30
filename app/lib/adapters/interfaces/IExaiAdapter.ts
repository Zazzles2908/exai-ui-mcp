/**
 * EXAI Adapter Interface
 * 
 * This interface defines the contract for EXAI backend communication.
 * Implementations can connect to local EXAI daemon or Supabase edge functions.
 */

export interface ExaiToolParams {
  step: string
  step_number: number
  total_steps: number
  next_step_required: boolean
  findings: string
  continuation_id?: string
  model?: string
  temperature?: number
  use_websearch?: boolean
  images?: string[]
  files?: string[]
  [key: string]: any // Allow tool-specific parameters
}

export interface ExaiResponse {
  status: string
  content?: string
  continuation_id?: string
  step_number?: number
  next_step_required?: boolean
  required_actions?: string[]
  expert_analysis?: string
  metadata?: {
    model_used?: string
    provider_used?: string
    tokens?: number
    duration?: number
    [key: string]: any
  }
  [key: string]: any // Allow tool-specific response fields
}

export interface StreamChunk {
  content: string
  is_final: boolean
  metadata?: any
}

export interface IExaiAdapter {
  /**
   * Execute a chat request
   */
  executeChat(params: {
    prompt: string
    model?: string
    temperature?: number
    thinking_mode?: string
    use_websearch?: boolean
    files?: string[]
    images?: string[]
    continuation_id?: string
  }): Promise<ExaiResponse>

  /**
   * Execute a debug workflow step
   */
  executeDebug(params: ExaiToolParams): Promise<ExaiResponse>

  /**
   * Execute an analyze workflow step
   */
  executeAnalyze(params: ExaiToolParams & {
    analysis_type?: string
    output_format?: string
  }): Promise<ExaiResponse>

  /**
   * Execute a code review workflow step
   */
  executeCodeReview(params: ExaiToolParams & {
    review_type?: string
    severity_filter?: string
    standards?: string
  }): Promise<ExaiResponse>

  /**
   * Execute a security audit workflow step
   */
  executeSecurityAudit(params: ExaiToolParams & {
    audit_focus?: string
    threat_level?: string
    compliance_requirements?: string[]
  }): Promise<ExaiResponse>

  /**
   * Execute a documentation generation workflow step
   */
  executeDocGen(params: ExaiToolParams & {
    document_complexity?: boolean
    document_flow?: boolean
    update_existing?: boolean
  }): Promise<ExaiResponse>

  /**
   * Execute a test generation workflow step
   */
  executeTestGen(params: ExaiToolParams): Promise<ExaiResponse>

  /**
   * Execute a planner workflow step
   */
  executePlanner(params: ExaiToolParams & {
    is_step_revision?: boolean
    is_branch_point?: boolean
  }): Promise<ExaiResponse>

  /**
   * Execute a consensus workflow step
   */
  executeConsensus(params: ExaiToolParams & {
    models?: Array<{ model: string; stance?: string }>
  }): Promise<ExaiResponse>

  /**
   * Execute a precommit workflow step
   */
  executePrecommit(params: ExaiToolParams & {
    compare_to?: string
    include_staged?: boolean
    include_unstaged?: boolean
  }): Promise<ExaiResponse>

  /**
   * Execute a refactor workflow step
   */
  executeRefactor(params: ExaiToolParams & {
    refactor_type?: string
  }): Promise<ExaiResponse>

  /**
   * Execute a tracer workflow step
   */
  executeTracer(params: ExaiToolParams & {
    target_description: string
    trace_mode?: string
  }): Promise<ExaiResponse>

  /**
   * Execute a challenge request
   */
  executeChallenge(params: {
    prompt: string
  }): Promise<ExaiResponse>

  /**
   * Execute a thinkdeep workflow step
   */
  executeThinkDeep(params: ExaiToolParams & {
    focus_areas?: string[]
  }): Promise<ExaiResponse>

  /**
   * Generic tool execution method
   */
  executeTool(tool: string, params: ExaiToolParams): Promise<ExaiResponse>

  /**
   * Stream a response (for real-time updates)
   */
  streamResponse(tool: string, params: ExaiToolParams): AsyncIterableIterator<StreamChunk>

  /**
   * Check connection health
   */
  healthCheck(): Promise<boolean>
}

