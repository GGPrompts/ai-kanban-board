/**
 * Beads File Watcher
 * Watches .beads/issues.jsonl for changes and emits events
 */

import { watch, FSWatcher } from 'fs'
import { readFile, stat } from 'fs/promises'
import { join, resolve } from 'path'
import { EventEmitter } from 'events'
import type { BeadsIssue } from './types'

/** Default debounce delay (100ms) */
const DEBOUNCE_MS = 100

/** Heartbeat interval (30s) */
const HEARTBEAT_INTERVAL_MS = 30000

/**
 * Parsed issue from JSONL with raw format support
 */
interface RawBeadsIssue {
  id: string
  title: string
  description?: string
  status: string
  priority?: number | string
  issue_type?: string
  created_at?: string
  updated_at?: string
  closed_at?: string
  close_reason?: string
  created_by?: string
  dependencies?: Array<{
    issue_id: string
    depends_on_id: string
    type: string
    created_at: string
    created_by: string
  }>
}

/**
 * Events emitted by BeadsWatcher
 */
export interface BeadsWatcherEvents {
  change: (issues: BeadsIssue[]) => void
  error: (error: Error) => void
  heartbeat: () => void
}

/**
 * Watcher options
 */
export interface BeadsWatcherOptions {
  /** Path to beads data directory (default: .beads) */
  dataDir?: string
  /** Debounce delay in ms (default: 100) */
  debounceMs?: number
  /** Enable heartbeat events (default: true) */
  heartbeat?: boolean
  /** Heartbeat interval in ms (default: 30000) */
  heartbeatIntervalMs?: number
}

/**
 * Watches .beads/issues.jsonl for changes
 *
 * @example
 * ```ts
 * const watcher = new BeadsWatcher({ dataDir: '.beads' })
 * watcher.on('change', (issues) => console.log('Updated:', issues.length))
 * watcher.start()
 * ```
 */
export class BeadsWatcher extends EventEmitter {
  private dataDir: string
  private issuesPath: string
  private debounceMs: number
  private heartbeatEnabled: boolean
  private heartbeatIntervalMs: number

  private watcher: FSWatcher | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private lastModified: number = 0
  private isWatching: boolean = false

  constructor(options: BeadsWatcherOptions = {}) {
    super()
    this.dataDir = options.dataDir || '.beads'
    this.issuesPath = join(this.dataDir, 'issues.jsonl')
    this.debounceMs = options.debounceMs ?? DEBOUNCE_MS
    this.heartbeatEnabled = options.heartbeat ?? true
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS
  }

  /**
   * Start watching for file changes
   */
  async start(): Promise<void> {
    if (this.isWatching) return

    try {
      // Resolve to absolute path
      const absolutePath = resolve(process.cwd(), this.issuesPath)

      // Initial read
      await this.readAndEmit()

      // Watch for changes
      this.watcher = watch(absolutePath, { persistent: true }, (eventType) => {
        if (eventType === 'change') {
          this.handleChange()
        }
      })

      this.watcher.on('error', (error) => {
        this.emit('error', error)
      })

      // Start heartbeat
      if (this.heartbeatEnabled) {
        this.heartbeatTimer = setInterval(() => {
          this.emit('heartbeat')
        }, this.heartbeatIntervalMs)
      }

      this.isWatching = true
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
    }

    this.isWatching = false
  }

  /**
   * Get current issues (one-time read)
   */
  async getIssues(): Promise<BeadsIssue[]> {
    const absolutePath = resolve(process.cwd(), this.issuesPath)
    return this.parseIssuesFile(absolutePath)
  }

  /**
   * Handle file change with debouncing
   */
  private handleChange(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(async () => {
      await this.readAndEmit()
    }, this.debounceMs)
  }

  /**
   * Read file and emit change event if modified
   */
  private async readAndEmit(): Promise<void> {
    try {
      const absolutePath = resolve(process.cwd(), this.issuesPath)

      // Check modification time to avoid duplicate events
      const stats = await stat(absolutePath)
      if (stats.mtimeMs === this.lastModified) return

      this.lastModified = stats.mtimeMs
      const issues = await this.parseIssuesFile(absolutePath)
      this.emit('change', issues)
    } catch (error) {
      this.emit('error', error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Parse JSONL file into BeadsIssue array
   */
  private async parseIssuesFile(filePath: string): Promise<BeadsIssue[]> {
    const content = await readFile(filePath, 'utf-8')
    const lines = content.trim().split('\n').filter(Boolean)

    return lines.map((line) => {
      const raw: RawBeadsIssue = JSON.parse(line)
      return this.normalizeIssue(raw)
    })
  }

  /**
   * Normalize raw JSONL issue to BeadsIssue type
   */
  private normalizeIssue(raw: RawBeadsIssue): BeadsIssue {
    // Map status values
    let status = raw.status
    if (status === 'open') {
      // Check for blockers
      const hasBlockers = raw.dependencies?.some(
        (d) => d.issue_id === raw.id && d.type === 'blocks'
      )
      status = hasBlockers ? 'blocked' : 'ready'
    } else if (status === 'in_progress') {
      status = 'in-progress'
    }

    // Map priority (number to string)
    let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    if (typeof raw.priority === 'number') {
      if (raw.priority === 1) priority = 'critical'
      else if (raw.priority === 2) priority = 'high'
      else if (raw.priority === 3) priority = 'medium'
      else priority = 'low'
    } else if (raw.priority) {
      priority = raw.priority as 'low' | 'medium' | 'high' | 'critical'
    }

    // Extract blocked-by IDs from dependencies
    const blockedBy = raw.dependencies
      ?.filter((d) => d.issue_id === raw.id && d.type === 'blocks')
      .map((d) => d.depends_on_id)

    return {
      id: raw.id,
      title: raw.title,
      description: raw.description,
      status: status as BeadsIssue['status'],
      priority,
      type: raw.issue_type as BeadsIssue['type'],
      blockedBy,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
      closeReason: raw.close_reason,
    }
  }
}

/**
 * Create a singleton watcher instance
 */
let globalWatcher: BeadsWatcher | null = null

export function getBeadsWatcher(options?: BeadsWatcherOptions): BeadsWatcher {
  if (!globalWatcher) {
    globalWatcher = new BeadsWatcher(options)
  }
  return globalWatcher
}

/**
 * Stop and clear the global watcher
 */
export function stopGlobalWatcher(): void {
  if (globalWatcher) {
    globalWatcher.stop()
    globalWatcher = null
  }
}
