/**
 * Beads Issues API Route
 * List issues from beads tracker
 */

import { NextRequest, NextResponse } from 'next/server'
import { listIssues, isBeadsAvailable, safe } from '@/lib/beads/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/beads/issues - List all beads issues
 *
 * Query params:
 * - status: Filter by status (ready, blocked, in-progress, done, closed)
 * - priority: Filter by priority (low, medium, high, critical)
 * - type: Filter by type (feature, bug, chore, etc)
 */
export async function GET(request: NextRequest) {
  // Check if beads is available
  const available = await isBeadsAvailable()
  if (!available) {
    return NextResponse.json(
      { error: 'Beads CLI not available', code: 'CLI_NOT_FOUND' },
      { status: 503 }
    )
  }

  // Parse filter params
  const { searchParams } = new URL(request.url)
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

  // Fetch issues
  const result = await safe(listIssues)(Object.keys(filter).length > 0 ? filter : undefined)

  if (result.success) {
    return NextResponse.json(result.data)
  } else {
    return NextResponse.json(
      { error: result.error.error, code: result.error.code },
      { status: 500 }
    )
  }
}
