"use client"

/**
 * useBeadsSync Hook
 * Real-time synchronization with beads issue tracker via SSE
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import type {
  BeadsIssue,
  BeadsSyncEvent,
  BeadsSyncConnectionState,
  UseBeadsSyncReturn,
} from '@/lib/beads/types'

/** Base delay for exponential backoff (1 second) */
const BASE_RECONNECT_DELAY_MS = 1000

/** Maximum reconnect delay (30 seconds) */
const MAX_RECONNECT_DELAY_MS = 30000

/** Maximum reconnect attempts before giving up */
const MAX_RECONNECT_ATTEMPTS = 10

/** Jitter factor for reconnect delay (20%) */
const JITTER_FACTOR = 0.2

/**
 * Calculate reconnect delay with exponential backoff and jitter
 */
function getReconnectDelay(attempt: number): number {
  const exponentialDelay = Math.min(
    BASE_RECONNECT_DELAY_MS * Math.pow(2, attempt),
    MAX_RECONNECT_DELAY_MS
  )
  const jitter = exponentialDelay * JITTER_FACTOR * Math.random()
  return exponentialDelay + jitter
}

export interface UseBeadsSyncOptions {
  /** Auto-connect on mount (default: true) */
  autoConnect?: boolean
  /** Callback when issues update */
  onUpdate?: (issues: BeadsIssue[]) => void
  /** Callback on connection error */
  onError?: (error: string) => void
  /** Callback on connection state change */
  onConnectionStateChange?: (state: BeadsSyncConnectionState) => void
}

/**
 * React hook for real-time beads issue synchronization
 *
 * @example
 * ```tsx
 * function KanbanBoard() {
 *   const { issues, isLoading, connectionState, lastSync } = useBeadsSync({
 *     onUpdate: (issues) => console.log('Issues updated:', issues.length),
 *   })
 *
 *   if (isLoading) return <div>Loading...</div>
 *
 *   return (
 *     <div>
 *       <span>Status: {connectionState}</span>
 *       {issues.map(issue => <IssueCard key={issue.id} issue={issue} />)}
 *     </div>
 *   )
 * }
 * ```
 */
export function useBeadsSync(options: UseBeadsSyncOptions = {}): UseBeadsSyncReturn {
  const {
    autoConnect = true,
    onUpdate,
    onError,
    onConnectionStateChange,
  } = options

  const [issues, setIssues] = useState<BeadsIssue[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [connectionState, setConnectionState] = useState<BeadsSyncConnectionState>('disconnected')
  const [error, setError] = useState<string | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  const eventSourceRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isConnectingRef = useRef(false)
  const connectRef = useRef<() => void>(() => {})

  // Update connection state and notify
  const updateConnectionState = useCallback((state: BeadsSyncConnectionState) => {
    setConnectionState(state)
    onConnectionStateChange?.(state)
  }, [onConnectionStateChange])

  // Disconnect from SSE stream
  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current)
      reconnectTimerRef.current = null
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }

    isConnectingRef.current = false
    updateConnectionState('disconnected')
  }, [updateConnectionState])

  // Connect to SSE stream
  const connect = useCallback(() => {
    // Prevent duplicate connections
    if (isConnectingRef.current || eventSourceRef.current) {
      return
    }

    isConnectingRef.current = true
    updateConnectionState('connecting')

    const eventSource = new EventSource('/api/beads/stream')
    eventSourceRef.current = eventSource

    eventSource.onmessage = (event) => {
      try {
        const data: BeadsSyncEvent = JSON.parse(event.data)

        switch (data.type) {
          case 'connected':
            isConnectingRef.current = false
            updateConnectionState('connected')
            setIsLoading(false)
            setError(null)
            setReconnectAttempts(0)
            if (data.issues) {
              setIssues(data.issues)
              setLastSync(new Date(data.timestamp))
              onUpdate?.(data.issues)
            }
            break

          case 'update':
            if (data.issues) {
              setIssues(data.issues)
              setLastSync(new Date(data.timestamp))
              onUpdate?.(data.issues)
            }
            break

          case 'heartbeat':
            // Connection still alive, nothing to do
            break

          case 'error':
            const errorMsg = data.error || 'Unknown error'
            setError(errorMsg)
            onError?.(errorMsg)
            break
        }
      } catch (e) {
        console.error('[useBeadsSync] Failed to parse event:', e)
      }
    }

    eventSource.onerror = () => {
      isConnectingRef.current = false
      eventSource.close()
      eventSourceRef.current = null

      // Schedule reconnect with exponential backoff
      setReconnectAttempts((prev) => {
        const newAttempts = prev + 1

        if (newAttempts >= MAX_RECONNECT_ATTEMPTS) {
          updateConnectionState('error')
          setError('Max reconnect attempts reached')
          onError?.('Max reconnect attempts reached')
          return newAttempts
        }

        updateConnectionState('disconnected')
        const delay = getReconnectDelay(newAttempts)

        reconnectTimerRef.current = setTimeout(() => {
          reconnectTimerRef.current = null
          connectRef.current()
        }, delay)

        return newAttempts
      })
    }
  }, [updateConnectionState, onUpdate, onError])

  // Keep connectRef in sync with connect callback
  useEffect(() => {
    connectRef.current = connect
  }, [connect])

  // Reconnect (disconnect then connect)
  const reconnect = useCallback(() => {
    disconnect()
    setReconnectAttempts(0)
    // Small delay before reconnecting
    setTimeout(connect, 100)
  }, [disconnect, connect])

  // Manual refresh (forces a reconnect)
  const refresh = useCallback(async () => {
    reconnect()
  }, [reconnect])

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, connect, disconnect])

  return {
    issues,
    isLoading,
    connectionState,
    error,
    lastSync,
    reconnectAttempts,
    refresh,
    disconnect,
    reconnect,
  }
}
