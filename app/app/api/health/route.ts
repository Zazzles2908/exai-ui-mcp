/**
 * Health Check API Route
 * 
 * Checks the health of EXAI and Database adapters
 */

import { NextResponse } from 'next/server'
import { checkAdapterHealth } from '@/lib/adapters/AdapterFactory'

export async function GET() {
  try {
    const health = await checkAdapterHealth()

    const status = health.exai && health.database ? 200 : 503

    return NextResponse.json(
      {
        status: status === 200 ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        adapters: {
          mode: health.mode,
          exai: {
            status: health.exai ? 'connected' : 'disconnected',
          },
          database: {
            status: health.database ? 'connected' : 'disconnected',
          },
        },
      },
      { status }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

