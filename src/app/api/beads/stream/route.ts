/**
 * Beads SSE Stream API Route
 * Streams real-time issue updates to connected clients
 */

import { NextRequest } from 'next/server'
import { BeadsWatcher } from '@/lib/beads/watcher'
import type { BeadsIssue, BeadsSyncEvent } from '@/lib/beads/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Heartbeat interval (30 seconds) */
const HEARTBEAT_INTERVAL_MS = 30000

/**
 * Format SSE event
 */
function formatSSE(event: BeadsSyncEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

/**
 * GET /api/beads/stream - SSE endpoint for real-time issue updates
 *
 * Clients connect to this endpoint and receive:
 * - 'connected' event on initial connection with current issues
 * - 'update' event when issues.jsonl changes
 * - 'heartbeat' event every 30s to keep connection alive
 * - 'error' event on errors
 */
export async function GET(request: NextRequest) {
  // Create a TransformStream for SSE
  const encoder = new TextEncoder()
  let isClosed = false

  const stream = new ReadableStream({
    async start(controller) {
      const watcher = new BeadsWatcher({
        dataDir: '.beads',
        debounceMs: 100,
        heartbeat: false, // We'll handle heartbeat manually
      })

      // Heartbeat timer
      const heartbeatTimer = setInterval(() => {
        if (isClosed) return
        try {
          const event: BeadsSyncEvent = {
            type: 'heartbeat',
            timestamp: new Date().toISOString(),
          }
          controller.enqueue(encoder.encode(formatSSE(event)))
        } catch {
          // Stream closed
        }
      }, HEARTBEAT_INTERVAL_MS)

      // Handle issue changes
      watcher.on('change', (issues: BeadsIssue[]) => {
        if (isClosed) return
        try {
          const event: BeadsSyncEvent = {
            type: 'update',
            timestamp: new Date().toISOString(),
            issues,
          }
          controller.enqueue(encoder.encode(formatSSE(event)))
        } catch {
          // Stream closed
        }
      })

      // Handle errors
      watcher.on('error', (error: Error) => {
        if (isClosed) return
        try {
          const event: BeadsSyncEvent = {
            type: 'error',
            timestamp: new Date().toISOString(),
            error: error.message,
          }
          controller.enqueue(encoder.encode(formatSSE(event)))
        } catch {
          // Stream closed
        }
      })

      // Cleanup on close
      request.signal.addEventListener('abort', () => {
        isClosed = true
        clearInterval(heartbeatTimer)
        watcher.stop()
        controller.close()
      })

      try {
        // Start watching and send initial state
        const issues = await watcher.getIssues()
        const connectedEvent: BeadsSyncEvent = {
          type: 'connected',
          timestamp: new Date().toISOString(),
          issues,
        }
        controller.enqueue(encoder.encode(formatSSE(connectedEvent)))

        // Start watching for changes
        await watcher.start()
      } catch (error) {
        const errorEvent: BeadsSyncEvent = {
          type: 'error',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Failed to start watcher',
        }
        controller.enqueue(encoder.encode(formatSSE(errorEvent)))
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  })
}
