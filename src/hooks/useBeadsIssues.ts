'use client'

/**
 * useBeadsIssues Hook
 * Fetches beads issues and maps them to kanban columns
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import type { BeadsIssue, BeadsStatus, BeadsListResponse, BeadsUpdatePayload, BeadsShowResponse } from '@/lib/beads/types'
import type { Task, Column } from '@/types'
import {
  groupIssuesByColumn,
  mapColumnToBeadsStatus,
  isBeadsTask,
} from '@/lib/beads/mappers'

// API wrappers for beads operations (replaces direct client import)
async function fetchBeadsStatus(): Promise<{ available: boolean }> {
  try {
    const res = await fetch('/api/beads/health')
    if (!res.ok) return { available: false }
    return res.json()
  } catch {
    return { available: false }
  }
}

async function fetchBeadsIssues(): Promise<BeadsListResponse> {
  const res = await fetch('/api/beads/issues')
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to fetch issues')
  }
  return res.json()
}

async function updateBeadsIssue(id: string, updates: BeadsUpdatePayload): Promise<BeadsShowResponse> {
  const res = await fetch(`/api/beads/issues/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  })
  if (!res.ok) {
    const error = await res.json()
    throw new Error(error.error || 'Failed to update issue')
  }
  return res.json()
}

export interface UseBeadsIssuesOptions {
  /** Columns to map issues to */
  columns: Column[]
  /** Custom status to column mapping */
  statusColumnMap?: Record<BeadsStatus, string>
  /** Auto-refresh interval in ms (0 to disable) */
  refreshInterval?: number
  /** Whether to enable beads integration */
  enabled?: boolean
}

export interface UseBeadsIssuesResult {
  /** Issues grouped by column ID */
  tasksByColumn: Map<string, Task[]>
  /** All issues as flat array */
  allTasks: Task[]
  /** Raw beads issues */
  rawIssues: BeadsIssue[]
  /** Loading state */
  isLoading: boolean
  /** Error message if any */
  error: string | null
  /** Whether beads CLI is available */
  isAvailable: boolean
  /** Refresh issues from beads */
  refresh: () => Promise<void>
  /** Update issue status on column change */
  syncTaskColumn: (taskId: string, newColumn: Column) => Promise<boolean>
}

/**
 * Hook to fetch and manage beads issues as kanban tasks
 */
export function useBeadsIssues({
  columns,
  statusColumnMap,
  refreshInterval = 0,
  enabled = true,
}: UseBeadsIssuesOptions): UseBeadsIssuesResult {
  const [tasksByColumn, setTasksByColumn] = useState<Map<string, Task[]>>(
    new Map()
  )
  const [rawIssues, setRawIssues] = useState<BeadsIssue[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isAvailable, setIsAvailable] = useState(false)

  const columnsRef = useRef(columns)
  columnsRef.current = columns

  // Check if beads CLI is available
  useEffect(() => {
    if (!enabled) {
      setIsAvailable(false)
      return
    }

    fetchBeadsStatus().then(({ available }) => setIsAvailable(available))
  }, [enabled])

  // Fetch issues from beads
  const refresh = useCallback(async () => {
    if (!enabled || !isAvailable) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await fetchBeadsIssues()
      const issues = result.issues
      setRawIssues(issues)

      // Group by column
      const grouped = groupIssuesByColumn(
        issues,
        columnsRef.current,
        statusColumnMap
      )
      setTasksByColumn(grouped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch issues')
    }

    setIsLoading(false)
  }, [enabled, isAvailable, statusColumnMap])

  // Initial fetch and refresh interval
  useEffect(() => {
    if (!enabled || !isAvailable) return

    refresh()

    if (refreshInterval > 0) {
      const interval = setInterval(refresh, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [enabled, isAvailable, refresh, refreshInterval])

  // Re-group when columns change
  useEffect(() => {
    if (rawIssues.length > 0) {
      const grouped = groupIssuesByColumn(rawIssues, columns, statusColumnMap)
      setTasksByColumn(grouped)
    }
  }, [columns, rawIssues, statusColumnMap])

  // Sync task column change to beads
  const syncTaskColumn = useCallback(
    async (taskId: string, newColumn: Column): Promise<boolean> => {
      // Only sync tasks that came from beads
      const task = Array.from(tasksByColumn.values())
        .flat()
        .find((t) => t.id === taskId)

      if (!task || !isBeadsTask(task)) {
        return false
      }

      const newStatus = mapColumnToBeadsStatus(newColumn)

      try {
        await updateBeadsIssue(taskId, { status: newStatus })
        // Optimistically update local state
        await refresh()
        return true
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update issue')
        return false
      }
    },
    [tasksByColumn, refresh]
  )

  // Compute flat list of all tasks
  const allTasks = Array.from(tasksByColumn.values()).flat()

  return {
    tasksByColumn,
    allTasks,
    rawIssues,
    isLoading,
    error,
    isAvailable,
    refresh,
    syncTaskColumn,
  }
}

/**
 * Simple hook to check beads availability
 */
export function useBeadsAvailable(): boolean {
  const [available, setAvailable] = useState(false)

  useEffect(() => {
    fetchBeadsStatus().then(({ available }) => setAvailable(available))
  }, [])

  return available
}
