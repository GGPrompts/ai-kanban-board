'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  WorkerInfo,
  ActivityEvent,
  WorkerConnection,
  FleetMetrics,
  WorkerStatus,
} from '@/types/monitoring'

interface UseWorkerMonitoringOptions {
  /** Polling interval in ms (default: 5000) */
  pollInterval?: number
  /** Whether polling is enabled */
  enabled?: boolean
  /** Initial mock data for development */
  mockData?: boolean
}

interface UseWorkerMonitoringResult {
  workers: WorkerInfo[]
  events: ActivityEvent[]
  connections: WorkerConnection[]
  metrics: FleetMetrics
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  spawnWorker: (name: string, beadsIssueId?: string) => Promise<void>
  killWorker: (workerId: string) => Promise<void>
}

/**
 * Generate mock worker data for development/demo
 */
function generateMockWorkers(): WorkerInfo[] {
  const statuses: WorkerStatus[] = ['busy', 'idle', 'idle', 'busy', 'error']
  const names = [
    'worker-auth-1',
    'worker-ui-2',
    'worker-api-3',
    'worker-test-4',
    'worker-docs-5',
  ]
  const issues = ['kanban-2pa', 'kanban-3xf', undefined, 'kanban-1ab', undefined]

  return names.map((name, idx) => ({
    id: `mock-${idx + 1}`,
    name,
    agentType: 'claude-code' as const,
    status: statuses[idx],
    beadsIssueId: issues[idx],
    spawnedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    lastActivity: new Date(Date.now() - Math.random() * 300000).toISOString(),
    health: Math.floor(70 + Math.random() * 30),
    tasksQueued: Math.floor(Math.random() * 5),
    tasksCompleted: Math.floor(Math.random() * 20 + 5),
    successRate: 0.85 + Math.random() * 0.15,
    avgDuration: 5 + Math.random() * 10,
    contextPercent: Math.floor(20 + Math.random() * 60),
    tokenUsage: {
      input: Math.floor(Math.random() * 50000),
      output: Math.floor(Math.random() * 10000),
      totalCost: Math.random() * 0.5,
    },
  }))
}

/**
 * Generate mock activity events
 */
function generateMockEvents(workers: WorkerInfo[]): ActivityEvent[] {
  const eventTypes: ActivityEvent['type'][] = [
    'task_started',
    'task_completed',
    'tool_use',
    'context_refresh',
    'task_completed',
  ]

  return Array.from({ length: 15 }, (_, idx) => {
    const worker = workers[Math.floor(Math.random() * workers.length)]
    const type = eventTypes[Math.floor(Math.random() * eventTypes.length)]

    const summaries: Record<ActivityEvent['type'], string[]> = {
      task_started: [
        'Started implementing authentication flow',
        'Beginning code review for PR #123',
        'Starting test suite execution',
      ],
      task_completed: [
        'Completed authentication implementation',
        'Finished code review with 3 suggestions',
        'All tests passing (42 tests)',
      ],
      task_failed: [
        'Failed to compile: missing dependency',
        'Test suite failed: 2 failures',
      ],
      tool_use: [
        'Read src/components/auth/LoginForm.tsx',
        'Edited src/lib/api.ts (15 lines)',
        'Executed npm run build',
        'Searched for "useAuth" pattern',
      ],
      context_refresh: [
        'Context compacted, re-injecting beads context',
        'Refreshed issue tracker context',
      ],
      worker_spawn: ['New worker session initialized'],
      worker_kill: ['Worker session terminated'],
    }

    return {
      id: `event-${idx}`,
      type,
      workerId: worker.id,
      workerName: worker.name,
      beadsIssueId: worker.beadsIssueId,
      summary:
        summaries[type][Math.floor(Math.random() * summaries[type].length)],
      timestamp: new Date(Date.now() - idx * 60000 - Math.random() * 30000).toISOString(),
    }
  })
}

/**
 * Generate mock worker connections
 */
function generateMockConnections(workers: WorkerInfo[]): WorkerConnection[] {
  if (workers.length < 2) return []

  const connections: WorkerConnection[] = []
  for (let i = 0; i < workers.length - 1; i++) {
    if (Math.random() > 0.5) {
      connections.push({
        from: workers[i].id,
        to: workers[i + 1].id,
        messages: Math.floor(Math.random() * 20 + 1),
        strength: 0.3 + Math.random() * 0.7,
      })
    }
  }
  return connections
}

/**
 * Hook for monitoring worker sessions with real-time updates
 * Integrates with conductor module for actual tmux session management
 */
export function useWorkerMonitoring({
  pollInterval = 5000,
  enabled = true,
  mockData = true, // Default to mock for development
}: UseWorkerMonitoringOptions = {}): UseWorkerMonitoringResult {
  const [workers, setWorkers] = useState<WorkerInfo[]>([])
  const [events, setEvents] = useState<ActivityEvent[]>([])
  const [connections, setConnections] = useState<WorkerConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Calculate aggregate metrics
  const metrics = useMemo<FleetMetrics>(() => {
    const activeWorkers = workers.filter((w) => w.status === 'busy').length
    const totalCompleted = workers.reduce((acc, w) => acc + w.tasksCompleted, 0)
    const avgSuccess =
      workers.length > 0
        ? workers.reduce((acc, w) => acc + w.successRate, 0) / workers.length
        : 0
    const totalCost = workers.reduce(
      (acc, w) => acc + (w.tokenUsage?.totalCost || 0),
      0
    )

    return {
      totalWorkers: workers.length,
      activeWorkers,
      totalTasksCompleted: totalCompleted,
      avgSuccessRate: avgSuccess,
      totalCost,
      avgCostPerTask: totalCompleted > 0 ? totalCost / totalCompleted : 0,
    }
  }, [workers])

  // Fetch worker data
  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (mockData) {
        // Use mock data for development
        await new Promise((resolve) => setTimeout(resolve, 500)) // Simulate network delay
        const mockWorkers = generateMockWorkers()
        setWorkers(mockWorkers)
        setEvents(generateMockEvents(mockWorkers))
        setConnections(generateMockConnections(mockWorkers))
      } else {
        // TODO: Integrate with actual conductor API
        // const response = await fetch('/api/conductor/workers')
        // const data = await response.json()
        // setWorkers(data.workers)
        // setEvents(data.events)
        // setConnections(data.connections)
        setWorkers([])
        setEvents([])
        setConnections([])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch workers')
    } finally {
      setIsLoading(false)
    }
  }, [mockData])

  // Spawn a new worker
  const spawnWorker = useCallback(
    async (name: string, beadsIssueId?: string) => {
      try {
        if (mockData) {
          // Mock spawn
          const newWorker: WorkerInfo = {
            id: `mock-${Date.now()}`,
            name,
            agentType: 'claude-code',
            status: 'idle',
            beadsIssueId,
            spawnedAt: new Date().toISOString(),
            health: 100,
            tasksQueued: 0,
            tasksCompleted: 0,
            successRate: 1,
            avgDuration: 0,
          }
          setWorkers((prev) => [...prev, newWorker])
          setEvents((prev) => [
            {
              id: `event-spawn-${Date.now()}`,
              type: 'worker_spawn',
              workerId: newWorker.id,
              workerName: name,
              beadsIssueId,
              summary: `Spawned new worker: ${name}`,
              timestamp: new Date().toISOString(),
            },
            ...prev,
          ])
        } else {
          // TODO: Call conductor API
          // await fetch('/api/conductor/spawn', {
          //   method: 'POST',
          //   body: JSON.stringify({ name, beadsIssueId }),
          // })
          // await refresh()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to spawn worker')
      }
    },
    [mockData]
  )

  // Kill a worker
  const killWorker = useCallback(
    async (workerId: string) => {
      try {
        const worker = workers.find((w) => w.id === workerId)
        if (!worker) return

        if (mockData) {
          // Mock kill
          setWorkers((prev) => prev.filter((w) => w.id !== workerId))
          setEvents((prev) => [
            {
              id: `event-kill-${Date.now()}`,
              type: 'worker_kill',
              workerId,
              workerName: worker.name,
              summary: `Terminated worker: ${worker.name}`,
              timestamp: new Date().toISOString(),
            },
            ...prev,
          ])
        } else {
          // TODO: Call conductor API
          // await fetch(`/api/conductor/kill/${workerId}`, { method: 'DELETE' })
          // await refresh()
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to kill worker')
      }
    },
    [mockData, workers]
  )

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      refresh()
    }
  }, [enabled, refresh])

  // Polling
  useEffect(() => {
    if (!enabled || pollInterval <= 0) return

    const interval = setInterval(refresh, pollInterval)
    return () => clearInterval(interval)
  }, [enabled, pollInterval, refresh])

  return {
    workers,
    events,
    connections,
    metrics,
    isLoading,
    error,
    refresh,
    spawnWorker,
    killWorker,
  }
}
