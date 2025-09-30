/**
 * Local Database Adapter Implementation
 * 
 * Uses Prisma ORM to connect to local PostgreSQL database
 */

import { PrismaClient } from '@prisma/client'
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

export class LocalDatabaseAdapter implements IDatabaseAdapter {
  private prisma: PrismaClient

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient()
  }

  // User operations
  async createUser(data: CreateUserInput): Promise<User> {
    return this.prisma.user.create({ data })
  }

  async getUser(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } })
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } })
  }

  async updateUser(id: string, data: UpdateUserInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data })
  }

  async deleteUser(id: string): Promise<void> {
    await this.prisma.user.delete({ where: { id } })
  }

  // Conversation operations
  async createConversation(data: CreateConversationInput): Promise<Conversation> {
    return this.prisma.conversation.create({ data })
  }

  async getConversation(id: string): Promise<Conversation | null> {
    return this.prisma.conversation.findUnique({ where: { id } })
  }

  async getConversations(
    userId: string,
    options?: { limit?: number; offset?: number; toolType?: string }
  ): Promise<Conversation[]> {
    return this.prisma.conversation.findMany({
      where: {
        userId,
        ...(options?.toolType && { toolType: options.toolType }),
      },
      orderBy: { updatedAt: 'desc' },
      take: options?.limit,
      skip: options?.offset,
    })
  }

  async updateConversation(id: string, data: UpdateConversationInput): Promise<Conversation> {
    return this.prisma.conversation.update({ where: { id }, data })
  }

  async deleteConversation(id: string): Promise<void> {
    await this.prisma.conversation.delete({ where: { id } })
  }

  // Message operations
  async createMessage(data: CreateMessageInput): Promise<Message> {
    return this.prisma.message.create({ data })
  }

  async getMessage(id: string): Promise<Message | null> {
    return this.prisma.message.findUnique({ where: { id } })
  }

  async getMessages(
    conversationId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<Message[]> {
    return this.prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: options?.limit,
      skip: options?.offset,
    })
  }

  async deleteMessage(id: string): Promise<void> {
    await this.prisma.message.delete({ where: { id } })
  }

  // Workflow operations
  async createWorkflow(data: CreateWorkflowInput): Promise<Workflow> {
    return this.prisma.workflow.create({ data })
  }

  async getWorkflow(id: string): Promise<Workflow | null> {
    return this.prisma.workflow.findUnique({ where: { id } })
  }

  async getWorkflows(conversationId: string): Promise<Workflow[]> {
    return this.prisma.workflow.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async updateWorkflow(id: string, data: UpdateWorkflowInput): Promise<Workflow> {
    return this.prisma.workflow.update({ where: { id }, data })
  }

  async deleteWorkflow(id: string): Promise<void> {
    await this.prisma.workflow.delete({ where: { id } })
  }

  // WorkflowStep operations
  async createWorkflowStep(data: CreateWorkflowStepInput): Promise<WorkflowStep> {
    return this.prisma.workflowStep.create({ data })
  }

  async getWorkflowStep(id: string): Promise<WorkflowStep | null> {
    return this.prisma.workflowStep.findUnique({ where: { id } })
  }

  async getWorkflowSteps(workflowId: string): Promise<WorkflowStep[]> {
    return this.prisma.workflowStep.findMany({
      where: { workflowId },
      orderBy: { stepNumber: 'asc' },
    })
  }

  async deleteWorkflowStep(id: string): Promise<void> {
    await this.prisma.workflowStep.delete({ where: { id } })
  }

  // File operations
  async createFile(data: CreateFileInput): Promise<File> {
    return this.prisma.file.create({ data })
  }

  async getFile(id: string): Promise<File | null> {
    return this.prisma.file.findUnique({ where: { id } })
  }

  async getFiles(
    userId: string,
    options?: { conversationId?: string; limit?: number; offset?: number }
  ): Promise<File[]> {
    return this.prisma.file.findMany({
      where: {
        userId,
        ...(options?.conversationId && { conversationId: options.conversationId }),
      },
      orderBy: { createdAt: 'desc' },
      take: options?.limit,
      skip: options?.offset,
    })
  }

  async deleteFile(id: string): Promise<void> {
    await this.prisma.file.delete({ where: { id } })
  }

  // UserSettings operations
  async createUserSettings(data: CreateUserSettingsInput): Promise<UserSettings> {
    return this.prisma.userSettings.create({ data })
  }

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    return this.prisma.userSettings.findUnique({ where: { userId } })
  }

  async updateUserSettings(userId: string, data: UpdateUserSettingsInput): Promise<UserSettings> {
    return this.prisma.userSettings.update({ where: { userId }, data })
  }

  // Session operations
  async createSession(data: CreateSessionInput): Promise<Session> {
    return this.prisma.session.create({ data })
  }

  async getSession(sessionToken: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { sessionToken } })
  }

  async updateSession(sessionToken: string, expires: Date): Promise<Session> {
    return this.prisma.session.update({
      where: { sessionToken },
      data: { expires },
    })
  }

  async deleteSession(sessionToken: string): Promise<void> {
    await this.prisma.session.delete({ where: { sessionToken } })
  }

  async deleteExpiredSessions(): Promise<void> {
    await this.prisma.session.deleteMany({
      where: {
        expires: {
          lt: new Date(),
        },
      },
    })
  }

  // Utility operations
  async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return true
    } catch {
      return false
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect()
  }
}

