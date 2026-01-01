/**
 * SSE Streaming Chat API Route
 * Streams Claude CLI responses to the client
 */

import { NextRequest } from 'next/server'
import { streamClaude, listClaudeAgents, isClaudeAvailable } from '@/lib/ai'
import type { ChatRequest, ClaudeAgent } from '@/lib/ai'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/chat - Stream a chat message
 */
export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json()
    const { messages, settings, sessionId } = body

    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'No messages provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Check if Claude is available
    const available = await isClaudeAvailable()
    if (!available) {
      return new Response(JSON.stringify({ error: 'Claude CLI not available' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Start streaming
    const result = await streamClaude(messages, settings, sessionId)

    // Return SSE stream
    return new Response(result.stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'  // Disable nginx buffering
      }
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

/**
 * GET /api/chat - Get available agents and check status
 */
export async function GET() {
  console.log('[API /api/chat GET] Starting...')
  try {
    console.log('[API /api/chat GET] Checking Claude availability...')
    const available = await isClaudeAvailable()
    console.log('[API /api/chat GET] Claude available:', available)

    console.log('[API /api/chat GET] Listing agents...')
    const agents = listClaudeAgents()
    console.log('[API /api/chat GET] Found agents:', agents.length)

    return new Response(
      JSON.stringify({
        available,
        agents
      }),
      {
        headers: { 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('[API /api/chat GET] Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
