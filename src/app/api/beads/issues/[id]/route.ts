/**
 * Beads Issue API Route
 * Get and update individual issues
 */

import { NextRequest, NextResponse } from 'next/server'
import { getIssue, updateIssue, isBeadsAvailable, safe } from '@/lib/beads/client'
import type { BeadsUpdatePayload } from '@/lib/beads/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * GET /api/beads/issues/[id] - Get a single issue
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  // Check if beads is available
  const available = await isBeadsAvailable()
  if (!available) {
    return NextResponse.json(
      { error: 'Beads CLI not available', code: 'CLI_NOT_FOUND' },
      { status: 503 }
    )
  }

  const result = await safe(getIssue)(id)

  if (result.success) {
    return NextResponse.json(result.data)
  } else {
    return NextResponse.json(
      { error: result.error.error, code: result.error.code },
      { status: result.error.code === 'NOT_FOUND' ? 404 : 500 }
    )
  }
}

/**
 * PATCH /api/beads/issues/[id] - Update an issue
 *
 * Body: BeadsUpdatePayload
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params

  // Check if beads is available
  const available = await isBeadsAvailable()
  if (!available) {
    return NextResponse.json(
      { error: 'Beads CLI not available', code: 'CLI_NOT_FOUND' },
      { status: 503 }
    )
  }

  // Parse update payload
  let updates: BeadsUpdatePayload
  try {
    updates = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body', code: 'INVALID_JSON' },
      { status: 400 }
    )
  }

  // Validate at least one field is being updated
  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: 'No update fields provided', code: 'EMPTY_UPDATE' },
      { status: 400 }
    )
  }

  const result = await safe(updateIssue)(id, updates)

  if (result.success) {
    return NextResponse.json(result.data)
  } else {
    return NextResponse.json(
      { error: result.error.error, code: result.error.code },
      { status: result.error.code === 'NOT_FOUND' ? 404 : 500 }
    )
  }
}
