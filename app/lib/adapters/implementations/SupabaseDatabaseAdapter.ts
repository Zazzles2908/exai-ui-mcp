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

  // Workflow operations - Similar pattern continues...
  // (Implementing remaining methods following the same pattern)

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

  // Implement remaining methods (Workflow, WorkflowStep, File, UserSettings, Session)
  // Following the same pattern as above...
}

