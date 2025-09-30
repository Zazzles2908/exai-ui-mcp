/**
 * Generic EXAI Tool API Route
 * 
 * Handles all EXAI workflow tools (debug, analyze, codereview, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getExaiAdapter, getDatabaseAdapter } from '@/lib/adapters/AdapterFactory'
import { z } from 'zod'

const toolSchema = z.object({
  step: z.string().min(1),
  step_number: z.number().int().min(1),
  total_steps: z.number().int().min(1),
  next_step_required: z.boolean(),
  findings: z.string(),
  conversationId: z.string().optional(),
  workflowId: z.string().optional(),
  continuation_id: z.string().optional(),
  hypothesis: z.string().optional(),
  confidence: z.enum(['exploring', 'low', 'medium', 'high', 'very_high', 'almost_certain', 'certain']).optional(),
  model: z.string().optional(),
  temperature: z.number().min(0).max(1).optional(),
  thinking_mode: z.enum(['minimal', 'low', 'medium', 'high', 'max']).optional(),
  use_websearch: z.boolean().optional(),
  files: z.array(z.string()).optional(),
  images: z.array(z.string()).optional(),
  relevant_files: z.array(z.string()).optional(),
  files_checked: z.array(z.string()).optional(),
  relevant_context: z.array(z.string()).optional(),
  issues_found: z.array(z.any()).optional(),
  backtrack_from_step: z.number().int().optional(),
}).passthrough() // Allow additional tool-specific parameters

const VALID_TOOLS = [
  'debug',
  'analyze',
  'codereview',
  'secaudit',
  'docgen',
  'testgen',
  'planner',
  'consensus',
  'precommit',
  'refactor',
  'tracer',
  'thinkdeep',
]

export async function POST(
  request: NextRequest,
  { params }: { params: { tool: string } }
) {
  try {
    const tool = params.tool

    // Validate tool name
    if (!VALID_TOOLS.includes(tool)) {
      return NextResponse.json(
        { error: `Invalid tool: ${tool}` },
        { status: 400 }
      )
    }

    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const params_data = toolSchema.parse(body)

    const exai = getExaiAdapter()
    const db = getDatabaseAdapter()

    const userId = (session.user as any).id

    // Create or get conversation
    let conversationId = params_data.conversationId
    if (!conversationId) {
      const conversation = await db.createConversation({
        userId,
        toolType: tool,
        title: `${tool} - ${params_data.step.substring(0, 50)}`,
      })
      conversationId = conversation.id
    }

    // Create or get workflow
    let workflowId = params_data.workflowId
    if (!workflowId) {
      const workflow = await db.createWorkflow({
        conversationId,
        toolType: tool,
        status: 'running',
        currentStep: params_data.step_number,
        totalSteps: params_data.total_steps,
        continuationId: params_data.continuation_id || null,
        result: null,
      })
      workflowId = workflow.id
    } else {
      // Update existing workflow
      await db.updateWorkflow(workflowId, {
        currentStep: params_data.step_number,
        totalSteps: params_data.total_steps,
        status: params_data.next_step_required ? 'running' : 'completed',
        continuationId: params_data.continuation_id || null,
      })
    }

    // Save workflow step
    await db.createWorkflowStep({
      workflowId,
      stepNumber: params_data.step_number,
      findings: params_data.findings,
      hypothesis: params_data.hypothesis || null,
      confidence: params_data.confidence || null,
      status: 'running',
      metadata: {
        step: params_data.step,
        relevant_files: params_data.relevant_files,
        files_checked: params_data.files_checked,
        relevant_context: params_data.relevant_context,
        issues_found: params_data.issues_found,
      },
    })

    // Execute tool request
    const response = await exai.executeTool(tool, params_data as any)

    // Update workflow step status
    const steps = await db.getWorkflowSteps(workflowId)
    const currentStepRecord = steps.find(s => s.stepNumber === params_data.step_number)
    if (currentStepRecord) {
      await db.createWorkflowStep({
        workflowId,
        stepNumber: params_data.step_number,
        findings: params_data.findings,
        hypothesis: params_data.hypothesis || null,
        confidence: params_data.confidence || null,
        status: 'completed',
        metadata: {
          ...currentStepRecord.metadata,
          response: response,
        },
      })
    }

    // If workflow is complete, save final result
    if (!params_data.next_step_required) {
      await db.updateWorkflow(workflowId, {
        status: 'completed',
        result: response,
      })
    }

    // Update conversation timestamp
    await db.updateConversation(conversationId, {
      updatedAt: new Date(),
    })

    return NextResponse.json({
      conversationId,
      workflowId,
      response,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }

    console.error(`Tool ${params.tool} error:`, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

