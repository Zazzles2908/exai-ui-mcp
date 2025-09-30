/**
 * EXAI Chat API Route
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getExaiAdapter, getDatabaseAdapter } from '@/lib/adapters/AdapterFactory'
import { z } from 'zod'

const chatSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required'),
  conversationId: z.string().optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  thinking_mode: z.enum(['minimal', 'low', 'medium', 'high', 'max']).optional(),
  use_websearch: z.boolean().optional(),
  files: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  continuation_id: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const params = chatSchema.parse(body)

    const exai = getExaiAdapter()
    const db = getDatabaseAdapter()

    const userId = (session.user as any).id

    // Create or get conversation
    let conversationId = params.conversationId
    if (!conversationId) {
      const conversation = await db.createConversation({
        userId,
        toolType: 'chat',
        title: params.prompt.substring(0, 100),
      })
      conversationId = conversation.id
    }

    // Save user message
    await db.createMessage({
      conversationId,
      role: 'user',
      content: params.prompt,
      metadata: {
        model: params.model,
        temperature: params.temperature,
        thinking_mode: params.thinking_mode,
        use_websearch: params.use_websearch,
      },
    })

    // Execute chat request
    const response = await exai.executeChat({
      prompt: params.prompt,
      model: params.model,
      temperature: params.temperature,
      thinking_mode: params.thinking_mode,
      use_websearch: params.use_websearch,
      files: params.files,
      images: params.images,
      continuation_id: params.continuation_id,
    })

    // Save assistant message
    await db.createMessage({
      conversationId,
      role: 'assistant',
      content: response.content || '',
      metadata: {
        continuation_id: response.continuation_id,
        ...response.metadata,
      },
    })

    // Update conversation timestamp
    await db.updateConversation(conversationId, {
      updatedAt: new Date(),
    })

    return NextResponse.json({
      conversationId,
      response,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Chat error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

