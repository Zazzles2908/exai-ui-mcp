/**
 * Supabase Database Adapter Implementation
 * 
 * Uses Supabase client to connect to cloud PostgreSQL database
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  IDatabaseAdapter,
  User,
  Conversation,
  Message,
  Workflow,
  WorkflowStep,
  File,
  UserSettings,
  Session,
  CreateUserInput,
  CreateConversationInput,
  CreateMessageInput,
  CreateWorkflowInput,
  CreateWorkflowStepInput,
  CreateFileInput,
  CreateUserSettingsInput,
  CreateSessionInput,
  UpdateUserInput,
  UpdateConversationInput,
  UpdateWorkflowInput,
  UpdateUserSettingsInput,
} from '../interfaces/IDatabaseAdapter'

export class SupabaseDatabaseAdapter implements IDatabaseAdapter {
  private supabase: SupabaseClient

  constructor() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured')
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }

  // User operations
  async createUser(data: CreateUserInput): Promise<User> {
    const { data: user, error } = await this.supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        name: data.name,
        role: data.role,
      },
    })

    if (error) throw error
    if (!user.user) throw new Error('Failed to create user')

    return {
      id: user.user.id,
      email: user.user.email!,
      name: data.name,
      password: data.password, // Note: Supabase handles password hashing
      role: data.role,
      createdAt: new Date(user.user.created_at),
      updatedAt: new Date(user.user.updated_at || user.user.created_at),
    }
  }

  async getUser(id: string): Promise<User | null> {
    const { data, error } = await this.supabase.auth.admin.getUserById(id)

    if (error || !data.user) return null

    return {
      id: data.user.id,
      email: data.user.email!,
      name: data.user.user_metadata?.name || null,
      password: '', // Password not retrievable
      role: data.user.user_metadata?.role || 'USER',
      createdAt: new Date(data.user.created_at),
      updatedAt: new Date(data.user.updated_at || data.user.created_at),
    }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('auth.users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) return null

    return {
      id: data.id,
      email: data.email,
      name: data.raw_user_meta_data?.name || null,
      password: '',
      role: data.raw_user_meta_data?.role || 'USER',
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at || data.created_at),
    }
  }

  async updateUser(id: string, data: UpdateUserInput): Promise<User> {
    const { data: user, error } = await this.supabase.auth.admin.updateUserById(id, {
      email: data.email,
      user_metadata: {
        name: data.name,
        role: data.role,
      },
    })

    if (error || !user.user) throw error || new Error('Failed to update user')

    return {
      id: user.user.id,
      email: user.user.email!,
      name: data.name || null,
      password: '',
      role: data.role || 'USER',
      createdAt: new Date(user.user.created_at),
      updatedAt: new Date(user.user.updated_at || user.user.created_at),
    }
  }

  async deleteUser(id: string): Promise<void> {
    const { error } = await this.supabase.auth.admin.deleteUser(id)
    if (error) throw error
  }

  // Conversation operations
  async createConversation(data: CreateConversationInput): Promise<Conversation> {
    const { data: conversation, error } = await this.supabase
      .from('exai_conversations')
      .insert({
        title: data.title,
        tool_type: data.toolType,
        user_id: data.userId,
      })
      .select()
      .single()

    if (error) throw error
    return this.mapConversation(conversation)
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const { data, error } = await this.supabase
      .from('exai_conversations')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return this.mapConversation(data)
  }

  async getConversations(
    userId: string,
    options?: { limit?: number; offset?: number; toolType?: string }
  ): Promise<Conversation[]> {
    let query = this.supabase
      .from('exai_conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })

    if (options?.toolType) {
      query = query.eq('tool_type', options.toolType)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []).map(this.mapConversation)
  }

  async updateConversation(id: string, data: UpdateConversationInput): Promise<Conversation> {
    const { data: conversation, error } = await this.supabase
      .from('exai_conversations')
      .update({
        title: data.title,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return this.mapConversation(conversation)
  }

  async deleteConversation(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('exai_conversations')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Message operations
  async createMessage(data: CreateMessageInput): Promise<Message> {
    const { data: message, error } = await this.supabase
      .from('exai_messages')
      .insert({
        role: data.role,
        content: data.content,
        conversation_id: data.conversationId,
        metadata: data.metadata,
      })
      .select()
      .single()

    if (error) throw error
    return this.mapMessage(message)
  }

  async getMessage(id: string): Promise<Message | null> {
    const { data, error } = await this.supabase
      .from('exai_messages')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return this.mapMessage(data)
  }

  async getMessages(
    conversationId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<Message[]> {
    let query = this.supabase
      .from('exai_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 100) - 1)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []).map(this.mapMessage)
  }

  async deleteMessage(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('exai_messages')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // Workflow operations
  async createWorkflow(data: CreateWorkflowInput): Promise<Workflow> {
    const { data: workflow, error } = await this.supabase
      .from('exai_workflows')
      .insert({
        conversation_id: data.conversationId,
        tool_type: data.toolType,
        status: data.status,
        current_step: data.currentStep,
        total_steps: data.totalSteps,
        continuation_id: data.continuationId,
        result: data.result,
      })
      .select()
      .single()

    if (error) throw error
    return this.mapWorkflow(workflow)
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    const { data, error } = await this.supabase
      .from('exai_workflows')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return this.mapWorkflow(data)
  }

  async getWorkflows(conversationId: string): Promise<Workflow[]> {
    const { data, error } = await this.supabase
      .from('exai_workflows')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map(this.mapWorkflow)
  }

  async updateWorkflow(id: string, data: UpdateWorkflowInput): Promise<Workflow> {
    const { data: workflow, error } = await this.supabase
      .from('exai_workflows')
      .update({
        status: data.status,
        current_step: data.currentStep,
        total_steps: data.totalSteps,
        continuation_id: data.continuationId,
        result: data.result,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return this.mapWorkflow(workflow)
  }

  async deleteWorkflow(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('exai_workflows')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // WorkflowStep operations
  async createWorkflowStep(data: CreateWorkflowStepInput): Promise<WorkflowStep> {
    const { data: step, error } = await this.supabase
      .from('exai_workflow_steps')
      .insert({
        workflow_id: data.workflowId,
        step_number: data.stepNumber,
        findings: data.findings,
        hypothesis: data.hypothesis,
        confidence: data.confidence,
        status: data.status,
        metadata: data.metadata,
      })
      .select()
      .single()

    if (error) throw error
    return this.mapWorkflowStep(step)
  }

  async getWorkflowStep(id: string): Promise<WorkflowStep | null> {
    const { data, error } = await this.supabase
      .from('exai_workflow_steps')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return this.mapWorkflowStep(data)
  }

  async getWorkflowSteps(workflowId: string): Promise<WorkflowStep[]> {
    const { data, error } = await this.supabase
      .from('exai_workflow_steps')
      .select('*')
      .eq('workflow_id', workflowId)
      .order('step_number', { ascending: true })

    if (error) throw error
    return (data || []).map(this.mapWorkflowStep)
  }

  async deleteWorkflowStep(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('exai_workflow_steps')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // File operations
  async createFile(data: CreateFileInput): Promise<File> {
    const { data: file, error } = await this.supabase
      .from('exai_files')
      .insert({
        name: data.name,
        size: data.size,
        type: data.type,
        url: data.url,
        user_id: data.userId,
        conversation_id: data.conversationId,
        workflow_step_id: data.workflowStepId,
      })
      .select()
      .single()

    if (error) throw error
    return this.mapFile(file)
  }

  async getFile(id: string): Promise<File | null> {
    const { data, error } = await this.supabase
      .from('exai_files')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return this.mapFile(data)
  }

  async getFiles(
    userId: string,
    options?: { conversationId?: string; limit?: number; offset?: number }
  ): Promise<File[]> {
    let query = this.supabase
      .from('exai_files')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (options?.conversationId) {
      query = query.eq('conversation_id', options.conversationId)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) throw error
    return (data || []).map(this.mapFile)
  }

  async deleteFile(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('exai_files')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // UserSettings operations
  async createUserSettings(data: CreateUserSettingsInput): Promise<UserSettings> {
    const { data: settings, error } = await this.supabase
      .from('exai_user_settings')
      .insert({
        user_id: data.userId,
        default_model: data.defaultModel,
        default_thinking_mode: data.defaultThinkingMode,
        web_search_enabled: data.webSearchEnabled,
        theme: data.theme,
        preferences: data.preferences,
      })
      .select()
      .single()

    if (error) throw error
    return this.mapUserSettings(settings)
  }

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    const { data, error } = await this.supabase
      .from('exai_user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error || !data) return null
    return this.mapUserSettings(data)
  }

  async updateUserSettings(userId: string, data: UpdateUserSettingsInput): Promise<UserSettings> {
    const { data: settings, error } = await this.supabase
      .from('exai_user_settings')
      .update({
        default_model: data.defaultModel,
        default_thinking_mode: data.defaultThinkingMode,
        web_search_enabled: data.webSearchEnabled,
        theme: data.theme,
        preferences: data.preferences,
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (error) throw error
    return this.mapUserSettings(settings)
  }

  // Session operations (using Supabase Auth sessions)
  async createSession(data: CreateSessionInput): Promise<Session> {
    // Note: Supabase handles sessions internally via auth
    // This is a compatibility layer for NextAuth
    const { data: session, error } = await this.supabase
      .from('exai_sessions')
      .insert({
        session_token: data.sessionToken,
        user_id: data.userId,
        expires: data.expires.toISOString(),
      })
      .select()
      .single()

    if (error) throw error
    return this.mapSession(session)
  }

  async getSession(sessionToken: string): Promise<Session | null> {
    const { data, error } = await this.supabase
      .from('exai_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .single()

    if (error || !data) return null
    return this.mapSession(data)
  }

  async updateSession(sessionToken: string, expires: Date): Promise<Session> {
    const { data: session, error } = await this.supabase
      .from('exai_sessions')
      .update({ expires: expires.toISOString() })
      .eq('session_token', sessionToken)
      .select()
      .single()

    if (error) throw error
    return this.mapSession(session)
  }

  async deleteSession(sessionToken: string): Promise<void> {
    const { error } = await this.supabase
      .from('exai_sessions')
      .delete()
      .eq('session_token', sessionToken)

    if (error) throw error
  }

  async deleteExpiredSessions(): Promise<void> {
    const { error } = await this.supabase
      .from('exai_sessions')
      .delete()
      .lt('expires', new Date().toISOString())

    if (error) throw error
  }

  // Helper methods to map Supabase data to our types
  private mapConversation(data: any): Conversation {
    return {
      id: data.id,
      title: data.title,
      toolType: data.tool_type,
      userId: data.user_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }

  private mapMessage(data: any): Message {
    return {
      id: data.id,
      role: data.role,
      content: data.content,
      conversationId: data.conversation_id,
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
    }
  }

  private mapWorkflow(data: any): Workflow {
    return {
      id: data.id,
      conversationId: data.conversation_id,
      toolType: data.tool_type,
      status: data.status,
      currentStep: data.current_step,
      totalSteps: data.total_steps,
      continuationId: data.continuation_id,
      result: data.result,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    }
  }

  private mapWorkflowStep(data: any): WorkflowStep {
    return {
      id: data.id,
      workflowId: data.workflow_id,
      stepNumber: data.step_number,
      findings: data.findings,
      hypothesis: data.hypothesis,
      confidence: data.confidence,
      status: data.status,
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
    }
  }

  private mapFile(data: any): File {
    return {
      id: data.id,
      name: data.name,
      size: data.size,
      type: data.type,
      url: data.url,
      userId: data.user_id,
      conversationId: data.conversation_id,
      workflowStepId: data.workflow_step_id,
      createdAt: new Date(data.created_at),
    }
  }

  private mapUserSettings(data: any): UserSettings {
    return {
      id: data.id,
      userId: data.user_id,
      defaultModel: data.default_model,
      defaultThinkingMode: data.default_thinking_mode,
      webSearchEnabled: data.web_search_enabled,
      theme: data.theme,
      preferences: data.preferences,
    }
  }

  private mapSession(data: any): Session {
    return {
      id: data.id,
      sessionToken: data.session_token,
      userId: data.user_id,
      expires: new Date(data.expires),
    }
  }

  // Utility operations
  async healthCheck(): Promise<boolean> {
    try {
      const { error } = await this.supabase.from('exai_conversations').select('id').limit(1)
      return !error
    } catch {
      return false
    }
  }

  async disconnect(): Promise<void> {
    // Supabase client doesn't require explicit disconnection
  }
}

