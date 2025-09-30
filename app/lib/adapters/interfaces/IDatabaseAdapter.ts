/**
 * Database Adapter Interface
 * 
 * This interface defines the contract for database operations.
 * Implementations can use local PostgreSQL or Supabase.
 */

import { Prisma } from '@prisma/client'

// Type definitions for database models
export interface User {
  id: string
  email: string
  name: string | null
  password: string
  role: 'USER' | 'ADMIN' | 'SUPER_ADMIN'
  createdAt: Date
  updatedAt: Date
}

export interface Conversation {
  id: string
  title: string | null
  toolType: string
  userId: string
  createdAt: Date
  updatedAt: Date
}

export interface Message {
  id: string
  role: string
  content: string
  conversationId: string
  metadata: any
  createdAt: Date
}

export interface Workflow {
  id: string
  conversationId: string
  toolType: string
  status: string
  currentStep: number
  totalSteps: number
  continuationId: string | null
  result: any
  createdAt: Date
  updatedAt: Date
}

export interface WorkflowStep {
  id: string
  workflowId: string
  stepNumber: number
  findings: string
  hypothesis: string | null
  confidence: string | null
  status: string
  metadata: any
  createdAt: Date
}

export interface File {
  id: string
  name: string
  size: number
  type: string
  url: string
  userId: string
  conversationId: string | null
  workflowStepId: string | null
  createdAt: Date
}

export interface UserSettings {
  id: string
  userId: string
  defaultModel: string
  defaultThinkingMode: string
  webSearchEnabled: boolean
  theme: string
  preferences: any
}

export interface Session {
  id: string
  sessionToken: string
  userId: string
  expires: Date
}

// Create input types
export type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'updatedAt'>
export type CreateConversationInput = Omit<Conversation, 'id' | 'createdAt' | 'updatedAt'>
export type CreateMessageInput = Omit<Message, 'id' | 'createdAt'>
export type CreateWorkflowInput = Omit<Workflow, 'id' | 'createdAt' | 'updatedAt'>
export type CreateWorkflowStepInput = Omit<WorkflowStep, 'id' | 'createdAt'>
export type CreateFileInput = Omit<File, 'id' | 'createdAt'>
export type CreateUserSettingsInput = Omit<UserSettings, 'id'>
export type CreateSessionInput = Omit<Session, 'id'>

// Update input types
export type UpdateUserInput = Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt'>>
export type UpdateConversationInput = Partial<Omit<Conversation, 'id' | 'createdAt' | 'updatedAt' | 'userId'>>
export type UpdateWorkflowInput = Partial<Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'conversationId'>>
export type UpdateUserSettingsInput = Partial<Omit<UserSettings, 'id' | 'userId'>>

export interface IDatabaseAdapter {
  // User operations
  createUser(data: CreateUserInput): Promise<User>
  getUser(id: string): Promise<User | null>
  getUserByEmail(email: string): Promise<User | null>
  updateUser(id: string, data: UpdateUserInput): Promise<User>
  deleteUser(id: string): Promise<void>

  // Conversation operations
  createConversation(data: CreateConversationInput): Promise<Conversation>
  getConversation(id: string): Promise<Conversation | null>
  getConversations(userId: string, options?: {
    limit?: number
    offset?: number
    toolType?: string
  }): Promise<Conversation[]>
  updateConversation(id: string, data: UpdateConversationInput): Promise<Conversation>
  deleteConversation(id: string): Promise<void>

  // Message operations
  createMessage(data: CreateMessageInput): Promise<Message>
  getMessage(id: string): Promise<Message | null>
  getMessages(conversationId: string, options?: {
    limit?: number
    offset?: number
  }): Promise<Message[]>
  deleteMessage(id: string): Promise<void>

  // Workflow operations
  createWorkflow(data: CreateWorkflowInput): Promise<Workflow>
  getWorkflow(id: string): Promise<Workflow | null>
  getWorkflows(conversationId: string): Promise<Workflow[]>
  updateWorkflow(id: string, data: UpdateWorkflowInput): Promise<Workflow>
  deleteWorkflow(id: string): Promise<void>

  // WorkflowStep operations
  createWorkflowStep(data: CreateWorkflowStepInput): Promise<WorkflowStep>
  getWorkflowStep(id: string): Promise<WorkflowStep | null>
  getWorkflowSteps(workflowId: string): Promise<WorkflowStep[]>
  deleteWorkflowStep(id: string): Promise<void>

  // File operations
  createFile(data: CreateFileInput): Promise<File>
  getFile(id: string): Promise<File | null>
  getFiles(userId: string, options?: {
    conversationId?: string
    limit?: number
    offset?: number
  }): Promise<File[]>
  deleteFile(id: string): Promise<void>

  // UserSettings operations
  createUserSettings(data: CreateUserSettingsInput): Promise<UserSettings>
  getUserSettings(userId: string): Promise<UserSettings | null>
  updateUserSettings(userId: string, data: UpdateUserSettingsInput): Promise<UserSettings>

  // Session operations
  createSession(data: CreateSessionInput): Promise<Session>
  getSession(sessionToken: string): Promise<Session | null>
  updateSession(sessionToken: string, expires: Date): Promise<Session>
  deleteSession(sessionToken: string): Promise<void>
  deleteExpiredSessions(): Promise<void>

  // Utility operations
  healthCheck(): Promise<boolean>
  disconnect(): Promise<void>
}

