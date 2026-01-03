/**
 * Beads Update API Route
 * Updates a beads issue
 */

import { NextRequest, NextResponse } from 'next/server'
import { updateIssue, isBeadsAvailable } from '@/lib/beads/client'
import type { BeadsUpdatePayload } from '@/lib/beads/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface UpdateRequestBody {
  id: string
  updates: BeadsUpdatePayload
}

/**
 * POST /api/beads/update - Update a beads issue
 */
export async function POST(request: NextRequest) {
  try {
    const available = await isBeadsAvailable()
    if (!available) {
      return NextResponse.json(
        { error: 'Beads CLI not available' },
        { status: 503 }
      )
    }

    const body: UpdateRequestBody = await request.json()
    const { id, updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Issue ID is required' },
        { status: 400 }
      )
    }

    const result = await updateIssue(id, updates)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[API /api/beads/update] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
