/**
 * Beads Health API Route
 * Check if beads CLI is available
 */

import { NextResponse } from 'next/server'
import { isBeadsAvailable, checkHealth, safe } from '@/lib/beads/client'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * GET /api/beads/health - Check beads CLI availability and daemon health
 */
export async function GET() {
  const available = await isBeadsAvailable()

  if (!available) {
    return NextResponse.json({
      available: false,
      running: false,
    })
  }

  const health = await safe(checkHealth)()

  if (health.success) {
    return NextResponse.json({
      available: true,
      ...health.data,
    })
  }

  return NextResponse.json({
    available: true,
    running: false,
  })
}
