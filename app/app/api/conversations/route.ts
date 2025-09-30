/**
 * Conversations API Route
 * 
 * GET - List all conversations for the authenticated user
 * POST - Create a new conversation
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getDatabaseAdapter } from '@/lib/adapters/AdapterFactory'
import { z } from 'zod'

const createConversationSchema = z.object({
  title: z.string().optional(),
  toolType: z.string().min(1, 'Tool type is required'),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const toolType = searchParams.get('toolType') || undefined

    const db = getDatabaseAdapter()
    const userId = (session.user as any).id

    const conversations = await db.getConversations(userId, {
      limit,
      offset,
      toolType,
    })

    return NextResponse.json({ conversations })
  } catch (error) {
    console.error('Get conversations error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title, toolType } = createConversationSchema.parse(body)

    const db = getDatabaseAdapter()
    const userId = (session.user as any).id

    const conversation = await db.createConversation({
      userId,
      title: title || null,
      toolType,
    })

    return NextResponse.json({ conversation }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Create conversation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

