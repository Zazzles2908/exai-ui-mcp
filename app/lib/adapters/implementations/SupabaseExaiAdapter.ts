/**
 * Supabase EXAI Adapter Implementation
 * 
 * Connects to cloud-hosted EXAI daemon or Supabase Edge Functions
 */

import { IExaiAdapter, ExaiToolParams, ExaiResponse, StreamChunk } from '../interfaces/IExaiAdapter'

export class SupabaseExaiAdapter implements IExaiAdapter {
  private exaiUrl: string
  private timeout: number

  constructor() {
    // In production, this should be your cloud-hosted EXAI daemon
    // Options: Fly.io, Railway, or Supabase Edge Functions
    this.exaiUrl = process.env.EXAI_CLOUD_URL || process.env.EXAI_DAEMON_URL || 'http://127.0.0.1:8765'
    this.timeout = parseInt(process.env.EXAI_TIMEOUT || '300000', 10)
  }

  /**
   * Make HTTP request to EXAI daemon
   */
  private async makeRequest(endpoint: string, params: any): Promise<ExaiResponse> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.exaiUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`EXAI daemon error: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return data as ExaiResponse
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('EXAI request timeout')
        }
        throw new Error(`EXAI request failed: ${error.message}`)
      }
      throw error
    }
  }

  async executeChat(params: {
    prompt: string
    model?: string
    temperature?: number
    thinking_mode?: string
    use_websearch?: boolean
    files?: string[]
    images?: string[]
    continuation_id?: string
  }): Promise<ExaiResponse> {
    return this.makeRequest('/chat', params)
  }

  async executeDebug(params: ExaiToolParams): Promise<ExaiResponse> {
    return this.makeRequest('/debug', params)
  }

  async executeAnalyze(params: ExaiToolParams & {
    analysis_type?: string
    output_format?: string
  }): Promise<ExaiResponse> {
    return this.makeRequest('/analyze', params)
  }

  async executeCodeReview(params: ExaiToolParams & {
    review_type?: string
    severity_filter?: string
    standards?: string
  }): Promise<ExaiResponse> {
    return this.makeRequest('/codereview', params)
  }

  async executeSecurityAudit(params: ExaiToolParams & {
    audit_focus?: string
    threat_level?: string
    compliance_requirements?: string[]
  }): Promise<ExaiResponse> {
    return this.makeRequest('/secaudit', params)
  }

  async executeDocGen(params: ExaiToolParams & {
    document_complexity?: boolean
    document_flow?: boolean
    update_existing?: boolean
  }): Promise<ExaiResponse> {
    return this.makeRequest('/docgen', params)
  }

  async executeTestGen(params: ExaiToolParams): Promise<ExaiResponse> {
    return this.makeRequest('/testgen', params)
  }

  async executePlanner(params: ExaiToolParams & {
    is_step_revision?: boolean
    is_branch_point?: boolean
  }): Promise<ExaiResponse> {
    return this.makeRequest('/planner', params)
  }

  async executeConsensus(params: ExaiToolParams & {
    models?: Array<{ model: string; stance?: string }>
  }): Promise<ExaiResponse> {
    return this.makeRequest('/consensus', params)
  }

  async executePrecommit(params: ExaiToolParams & {
    compare_to?: string
    include_staged?: boolean
    include_unstaged?: boolean
  }): Promise<ExaiResponse> {
    return this.makeRequest('/precommit', params)
  }

  async executeRefactor(params: ExaiToolParams & {
    refactor_type?: string
  }): Promise<ExaiResponse> {
    return this.makeRequest('/refactor', params)
  }

  async executeTracer(params: ExaiToolParams & {
    target_description: string
    trace_mode?: string
  }): Promise<ExaiResponse> {
    return this.makeRequest('/tracer', params)
  }

  async executeChallenge(params: {
    prompt: string
  }): Promise<ExaiResponse> {
    return this.makeRequest('/challenge', params)
  }

  async executeThinkDeep(params: ExaiToolParams & {
    focus_areas?: string[]
  }): Promise<ExaiResponse> {
    return this.makeRequest('/thinkdeep', params)
  }

  async executeTool(tool: string, params: ExaiToolParams): Promise<ExaiResponse> {
    return this.makeRequest(`/${tool}`, params)
  }

  async *streamResponse(tool: string, params: ExaiToolParams): AsyncIterableIterator<StreamChunk> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      const response = await fetch(`${this.exaiUrl}/${tool}/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`EXAI daemon error: ${response.status} ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error('Response body is null')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk = JSON.parse(line) as StreamChunk
              yield chunk
            } catch (e) {
              console.error('Failed to parse stream chunk:', e)
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const chunk = JSON.parse(buffer) as StreamChunk
          yield chunk
        } catch (e) {
          console.error('Failed to parse final chunk:', e)
        }
      }
    } catch (error) {
      clearTimeout(timeoutId)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('EXAI stream timeout')
        }
        throw new Error(`EXAI stream failed: ${error.message}`)
      }
      throw error
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.exaiUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      })
      return response.ok
    } catch {
      return false
    }
  }
}

