/**
 * Beads CLI Client
 * Wraps the `bd` CLI for beads issue tracker integration
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import type {
  BeadsIssue,
  BeadsListResponse,
  BeadsReadyResponse,
  BeadsBlockedResponse,
  BeadsShowResponse,
  BeadsUpdatePayload,
  BeadsError,
  BeadsResult,
  BeadsDaemonHealth,
} from './types'

const execAsync = promisify(exec)

/** Default timeout for bd commands (30 seconds) */
const DEFAULT_TIMEOUT = 30000

/** bd CLI binary name */
const BD_BIN = 'bd'

/**
 * Error thrown when the bd CLI is not available
 */
export class BeadsCliNotFoundError extends Error {
  constructor() {
    super('bd CLI not found. Please install beads: https://github.com/beads-ai/beads')
    this.name = 'BeadsCliNotFoundError'
  }
}

/**
 * Error thrown when a bd command fails
 */
export class BeadsCommandError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly stderr?: string
  ) {
    super(message)
    this.name = 'BeadsCommandError'
  }
}

/**
 * Execute a bd CLI command with JSON output
 *
 * @param cmd - The bd subcommand to run (e.g., 'list', 'ready')
 * @param args - Additional arguments to pass
 * @param options - Execution options
 * @returns Parsed JSON response from bd
 *
 * @example
 * ```ts
 * const result = await bdCommand('list')
 * console.log(result.issues)
 * ```
 */
export async function bdCommand<T = unknown>(
  cmd: string,
  args: string[] = [],
  options: { timeout?: number; cwd?: string } = {}
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, cwd } = options

  // Build the full command with --json flag
  const fullArgs = [cmd, '--json', ...args]
  const command = `${BD_BIN} ${fullArgs.join(' ')}`

  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      cwd,
      env: process.env,
    })

    // Log stderr warnings but don't fail
    if (stderr && !stderr.includes('error')) {
      console.warn(`[beads] ${stderr.trim()}`)
    }

    // Parse JSON output
    const trimmed = stdout.trim()
    if (!trimmed) {
      // Some commands return empty on success
      return {} as T
    }

    try {
      return JSON.parse(trimmed) as T
    } catch {
      // If not JSON, might be JSONL (one JSON object per line)
      const lines = trimmed.split('\n').filter(Boolean)
      if (lines.length > 1) {
        return lines.map((line) => JSON.parse(line)) as T
      }
      throw new BeadsCommandError(`Invalid JSON response from bd: ${trimmed}`)
    }
  } catch (error) {
    // Handle exec errors
    if (error instanceof Error) {
      // Check for command not found
      if ('code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new BeadsCliNotFoundError()
      }

      // Check for spawn error (command not found on PATH)
      if (error.message.includes('not found') || error.message.includes('ENOENT')) {
        throw new BeadsCliNotFoundError()
      }

      // Extract stderr from exec error
      const execError = error as Error & { stderr?: string; code?: number }
      if (execError.stderr) {
        // Try to parse error JSON from stderr
        try {
          const errorData = JSON.parse(execError.stderr) as BeadsError
          throw new BeadsCommandError(
            errorData.error,
            errorData.code,
            execError.stderr
          )
        } catch {
          throw new BeadsCommandError(
            execError.stderr.trim() || error.message,
            String(execError.code),
            execError.stderr
          )
        }
      }

      throw new BeadsCommandError(error.message)
    }

    throw error
  }
}

/**
 * List all issues from the beads tracker
 *
 * @param filter - Optional status filter
 * @returns List of all issues
 *
 * @example
 * ```ts
 * const { issues } = await listIssues()
 * const readyIssues = issues.filter(i => i.status === 'ready')
 * ```
 */
export async function listIssues(
  filter?: { status?: string; priority?: string; type?: string; all?: boolean }
): Promise<BeadsListResponse> {
  // Default to --all to include closed issues for kanban board
  const args: string[] = ['--all']

  if (filter?.status) {
    args.push('--status', filter.status)
  }
  if (filter?.priority) {
    args.push('--priority', filter.priority)
  }
  if (filter?.type) {
    args.push('--type', filter.type)
  }

  const result = await bdCommand<BeadsIssue[] | BeadsListResponse>('list', args)

  // Handle both array and object responses
  if (Array.isArray(result)) {
    return { issues: result, total: result.length }
  }

  return result
}

/**
 * Get all ready issues (not blocked, ready to work on)
 *
 * @returns List of issues ready for work
 *
 * @example
 * ```ts
 * const { issues } = await getReady()
 * const nextTask = issues[0]
 * ```
 */
export async function getReady(): Promise<BeadsReadyResponse> {
  const result = await bdCommand<BeadsIssue[] | BeadsReadyResponse>('ready')

  if (Array.isArray(result)) {
    return { issues: result, total: result.length }
  }

  return result
}

/**
 * Get all blocked issues with their blockers
 *
 * @returns List of blocked issues and what's blocking them
 *
 * @example
 * ```ts
 * const { issues, blockers } = await getBlocked()
 * console.log(`${issues[0].id} blocked by: ${blockers[issues[0].id].join(', ')}`)
 * ```
 */
export async function getBlocked(): Promise<BeadsBlockedResponse> {
  const result = await bdCommand<BeadsIssue[] | BeadsBlockedResponse>('blocked')

  if (Array.isArray(result)) {
    // Build blockers map from issues
    const blockers: Record<string, string[]> = {}
    for (const issue of result) {
      if (issue.blockedBy && issue.blockedBy.length > 0) {
        blockers[issue.id] = issue.blockedBy
      }
    }
    return { issues: result, blockers }
  }

  return result
}

/**
 * Get a single issue by ID
 *
 * @param id - Issue ID (e.g., 'kanban-mo4')
 * @returns The issue details
 *
 * @example
 * ```ts
 * const { issue } = await getIssue('kanban-mo4')
 * console.log(issue.title, issue.status)
 * ```
 */
export async function getIssue(id: string): Promise<BeadsShowResponse> {
  const result = await bdCommand<BeadsIssue | BeadsShowResponse>('show', [id])

  // Handle both direct issue and wrapped response
  if ('issue' in result) {
    return result
  }

  return { issue: result as BeadsIssue }
}

/**
 * Update an issue's fields
 *
 * @param id - Issue ID to update
 * @param updates - Fields to update
 * @returns Updated issue
 *
 * @example
 * ```ts
 * await updateIssue('kanban-mo4', {
 *   status: 'in-progress',
 *   assignee: 'claude-code'
 * })
 * ```
 */
export async function updateIssue(
  id: string,
  updates: BeadsUpdatePayload
): Promise<BeadsShowResponse> {
  const args: string[] = [id]

  // Build update arguments
  if (updates.title) {
    args.push('--title', updates.title)
  }
  if (updates.description) {
    args.push('--description', updates.description)
  }
  if (updates.status) {
    args.push('--status', updates.status)
  }
  if (updates.priority) {
    args.push('--priority', updates.priority)
  }
  if (updates.type) {
    args.push('--type', updates.type)
  }
  if (updates.labels && updates.labels.length > 0) {
    args.push('--labels', updates.labels.join(','))
  }
  if (updates.blockedBy && updates.blockedBy.length > 0) {
    args.push('--blocked-by', updates.blockedBy.join(','))
  }
  if (updates.assignee) {
    args.push('--assignee', updates.assignee)
  }
  if (updates.branch) {
    args.push('--branch', updates.branch)
  }
  if (updates.pr !== undefined) {
    args.push('--pr', String(updates.pr))
  }
  if (updates.estimate) {
    args.push('--estimate', updates.estimate)
  }

  return bdCommand<BeadsShowResponse>('update', args)
}

/**
 * Close an issue with a reason
 *
 * @param id - Issue ID to close
 * @param reason - Reason for closing (e.g., 'completed', 'wontfix')
 * @returns Closed issue
 *
 * @example
 * ```ts
 * await closeIssue('kanban-mo4', 'Implemented CLI wrapper')
 * ```
 */
export async function closeIssue(
  id: string,
  reason: string
): Promise<BeadsShowResponse> {
  return bdCommand<BeadsShowResponse>('close', [id, '--reason', reason])
}

/**
 * Create a new issue
 *
 * @param issue - Issue data
 * @returns Created issue
 *
 * @example
 * ```ts
 * const { issue } = await createIssue({
 *   title: 'Add dark mode',
 *   priority: 'medium',
 *   type: 'feature'
 * })
 * ```
 */
export async function createIssue(
  issue: Omit<BeadsIssue, 'id' | 'status' | 'createdAt' | 'updatedAt'>
): Promise<BeadsShowResponse> {
  const args: string[] = [issue.title]

  if (issue.description) {
    args.push('--description', issue.description)
  }
  if (issue.priority) {
    args.push('--priority', issue.priority)
  }
  if (issue.type) {
    args.push('--type', issue.type)
  }
  if (issue.labels && issue.labels.length > 0) {
    args.push('--labels', issue.labels.join(','))
  }
  if (issue.blockedBy && issue.blockedBy.length > 0) {
    args.push('--blocked-by', issue.blockedBy.join(','))
  }
  if (issue.assignee) {
    args.push('--assignee', issue.assignee)
  }
  if (issue.estimate) {
    args.push('--estimate', issue.estimate)
  }

  return bdCommand<BeadsShowResponse>('create', args)
}

/**
 * Check beads daemon health
 *
 * @returns Daemon health status
 *
 * @example
 * ```ts
 * const health = await checkHealth()
 * if (!health.running) {
 *   console.log('Start beads daemon with: bd daemon start')
 * }
 * ```
 */
export async function checkHealth(): Promise<BeadsDaemonHealth> {
  try {
    const result = await bdCommand<BeadsDaemonHealth>('health')
    return { ...result, running: true }
  } catch (error) {
    if (error instanceof BeadsCliNotFoundError) {
      throw error
    }
    return { running: false }
  }
}

/**
 * Check if bd CLI is available
 *
 * @returns true if bd is installed and accessible
 *
 * @example
 * ```ts
 * if (await isBeadsAvailable()) {
 *   const issues = await listIssues()
 * }
 * ```
 */
export async function isBeadsAvailable(): Promise<boolean> {
  try {
    await execAsync(`${BD_BIN} --version`, { timeout: 5000 })
    return true
  } catch {
    return false
  }
}

/**
 * Safe wrapper that returns BeadsResult instead of throwing
 *
 * @param fn - Async function to wrap
 * @returns Result object with success/error
 *
 * @example
 * ```ts
 * const result = await safe(listIssues)()
 * if (result.success) {
 *   console.log(result.data.issues)
 * } else {
 *   console.error(result.error)
 * }
 * ```
 */
export function safe<T, Args extends unknown[]>(
  fn: (...args: Args) => Promise<T>
): (...args: Args) => Promise<BeadsResult<T>> {
  return async (...args: Args): Promise<BeadsResult<T>> => {
    try {
      const data = await fn(...args)
      return { success: true, data }
    } catch (error) {
      if (error instanceof BeadsCommandError) {
        return {
          success: false,
          error: {
            error: error.message,
            code: error.code,
            details: error.stderr,
          },
        }
      }
      if (error instanceof BeadsCliNotFoundError) {
        return {
          success: false,
          error: {
            error: error.message,
            code: 'CLI_NOT_FOUND',
          },
        }
      }
      return {
        success: false,
        error: {
          error: error instanceof Error ? error.message : String(error),
        },
      }
    }
  }
}
