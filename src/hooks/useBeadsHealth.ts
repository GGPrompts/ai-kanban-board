"use client"

/**
 * useBeadsHealth Hook
 * Polls beads daemon health status at regular intervals
 */

import { useState, useEffect, useCallback, useRef } from 'react'

/** Polling interval (30 seconds) */
const POLL_INTERVAL_MS = 30000

/** Stale threshold - if lastSync is older than this, consider stale (5 minutes) */
const STALE_THRESHOLD_MS = 5 * 60 * 1000

/**
 * Health status for the beads daemon
 */
export type BeadsHealthStatus = 'healthy' | 'stale' | 'offline'

/**
 * Health response from the API
 */
interface HealthResponse {
  available: boolean
  running: boolean
  version?: string
  issueCount?: number
  dataDir?: string
  lastSync?: string
}

/**
 * Return type for useBeadsHealth hook
 */
export interface UseBeadsHealthReturn {
  /** Current health status */
  status: BeadsHealthStatus
  /** Whether currently fetching health */
  isLoading: boolean
  /** Last successful check timestamp */
  lastChecked: Date | null
  /** Error message if any */
  error: string | null
  /** Manually trigger a health check */
  refresh: () => Promise<void>
  /** Raw health data from API */
  data: HealthResponse | null
}

/**
 * Determine health status from API response
 */
function getHealthStatus(data: HealthResponse | null): BeadsHealthStatus {
  if (!data || !data.available || !data.running) {
    return 'offline'
  }

  // Check if lastSync exists and is recent
  if (data.lastSync) {
    const lastSyncTime = new Date(data.lastSync).getTime()
    const now = Date.now()
    if (now - lastSyncTime > STALE_THRESHOLD_MS) {
      return 'stale'
    }
  }

  return 'healthy'
}

/**
 * React hook for polling beads daemon health
 *
 * @example
 * ```tsx
 * function StatusIndicator() {
 *   const { status, isLoading } = useBeadsHealth()
 *
 *   return (
 *     <div>
 *       {status === 'healthy' && <span className="text-green-500">●</span>}
 *       {status === 'stale' && <span className="text-yellow-500">●</span>}
 *       {status === 'offline' && <span className="text-gray-500">○</span>}
 *     </div>
 *   )
 * }
 * ```
 */
export function useBeadsHealth(): UseBeadsHealthReturn {
  const [status, setStatus] = useState<BeadsHealthStatus>('offline')
  const [isLoading, setIsLoading] = useState(true)
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<HealthResponse | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isMountedRef = useRef(true)

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/beads/health')

      if (!isMountedRef.current) return

      if (!response.ok) {
        setStatus('offline')
        setError(`Health check failed: ${response.status}`)
        return
      }

      const healthData: HealthResponse = await response.json()

      if (!isMountedRef.current) return

      setData(healthData)
      setStatus(getHealthStatus(healthData))
      setLastChecked(new Date())
      setError(null)
    } catch (err) {
      if (!isMountedRef.current) return

      setStatus('offline')
      setError(err instanceof Error ? err.message : 'Health check failed')
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  const refresh = useCallback(async () => {
    setIsLoading(true)
    await checkHealth()
  }, [checkHealth])

  // Initial check and polling setup
  useEffect(() => {
    isMountedRef.current = true

    // Initial health check
    checkHealth()

    // Set up polling interval
    intervalRef.current = setInterval(checkHealth, POLL_INTERVAL_MS)

    return () => {
      isMountedRef.current = false
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [checkHealth])

  return {
    status,
    isLoading,
    lastChecked,
    error,
    refresh,
    data,
  }
}
