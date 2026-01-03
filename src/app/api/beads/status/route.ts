/**
 * Beads Status API Route
 * Checks if beads CLI is available
 */

import { NextResponse } from 'next/server'
import { isBeadsAvailable, checkHealth } from '@/lib/beads/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/beads/status - Check beads CLI availability and health
 */
export async function GET() {
  try {
    const available = await isBeadsAvailable()

    if (!available) {
      return NextResponse.json({
        available: false,
        health: null,
      })
    }

    const health = await checkHealth()

    return NextResponse.json({
      available: true,
      health,
    })
  } catch (error) {
    console.error('[API /api/beads/status] Error:', error)
    return NextResponse.json(
      {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
