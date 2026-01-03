/**
 * Beads List API Route
 * Returns all issues from beads tracker
 */

import { NextRequest, NextResponse } from 'next/server'
import { listIssues, isBeadsAvailable } from '@/lib/beads/client'
import type { BeadsListResponse } from '@/lib/beads/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/beads/list - Get all beads issues
 */
export async function GET(request: NextRequest) {
  try {
    const available = await isBeadsAvailable()
    if (!available) {
      return NextResponse.json(
        { error: 'Beads CLI not available' },
        { status: 503 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const filter: { status?: string; priority?: string; type?: string } = {}

    if (searchParams.has('status')) {
      filter.status = searchParams.get('status')!
    }
    if (searchParams.has('priority')) {
      filter.priority = searchParams.get('priority')!
    }
    if (searchParams.has('type')) {
      filter.type = searchParams.get('type')!
    }

    const result = await listIssues(Object.keys(filter).length > 0 ? filter : undefined)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API /api/beads/list] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
