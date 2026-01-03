/**
 * Conductor Worker Management
 * Spawn and manage Claude Code worker sessions with beads context
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import {
  getBeadsContext,
  formatContextForWorker,
  injectContext,
  type BeadsContext,
} from './context'

const execAsync = promisify(exec)

/**
 * Tracked worker session state
 */
export interface WorkerSession {
  /** Session name (tmux target) */
  name: string
  /** Beads issue ID this worker is assigned to */
  beadsIssueId?: string
  /** When the session was spawned */
  spawnedAt: string
  /** When context was last injected */
  lastContextInjection?: string
  /** Last known context percentage (for detecting compaction) */
  lastContextPercent?: number
  /** Whether session has been primed with initial context */
  primed: boolean
}

/**
 * Worker spawn options
 */
export interface SpawnOptions {
  /** Working directory for the session */
  cwd?: string
  /** Additional environment variables */
  env?: Record<string, string>
  /** Command to run in the session (defaults to 'claude') */
  command?: string
  /** Whether to inject beads context automatically */
  injectContext?: boolean
  /** Initial prompt to send after spawning */
  initialPrompt?: string
}

/**
 * In-memory tracking of worker sessions
 * In production, this could be persisted to disk
 */
const sessions = new Map<string, WorkerSession>()

/**
 * Check if a tmux session exists
 */
async function sessionExists(name: string): Promise<boolean> {
  try {
    await execAsync(`tmux has-session -t "${name}" 2>/dev/null`)
    return true
  } catch {
    return false
  }
}

/**
 * Create a new tmux session
 */
async function createSession(
  name: string,
  options: SpawnOptions = {}
): Promise<boolean> {
  const { cwd, env, command = 'claude' } = options

  try {
    // Build the tmux new-session command
    const cwdArg = cwd ? `-c "${cwd}"` : ''
    const cmd = `tmux new-session -d -s "${name}" ${cwdArg} "${command}"`

    // Set up environment if provided
    if (env) {
      const envStr = Object.entries(env)
        .map(([k, v]) => `${k}="${v}"`)
        .join(' ')
      await execAsync(`${envStr} ${cmd}`)
    } else {
      await execAsync(cmd)
    }

    return true
  } catch (error) {
    console.error(`[conductor] Failed to create session ${name}:`, error)
    return false
  }
}

/**
 * Get the context percentage from a Claude session
 * Returns undefined if unable to detect
 */
async function getContextPercent(sessionName: string): Promise<number | undefined> {
  try {
    // Capture the pane content and look for context indicator
    const { stdout } = await execAsync(
      `tmux capture-pane -t "${sessionName}" -p | grep -oE 'Context: [0-9]+%' | tail -1`
    )

    const match = stdout.trim().match(/Context: (\d+)%/)
    if (match) {
      return parseInt(match[1], 10)
    }
    return undefined
  } catch {
    return undefined
  }
}

/**
 * Spawn a new worker session with beads context
 *
 * @param name - Unique name for the worker session
 * @param task - Task description to send to the worker
 * @param beadsIssueId - Optional beads issue ID to associate
 * @param options - Spawn options
 * @returns The worker session info
 *
 * @example
 * ```ts
 * const session = await spawnWorkerWithContext(
 *   'worker-auth-1',
 *   'Implement authentication flow',
 *   'kanban-2pa'
 * )
 * ```
 */
export async function spawnWorkerWithContext(
  name: string,
  task: string,
  beadsIssueId?: string,
  options: SpawnOptions = {}
): Promise<WorkerSession> {
  const { injectContext: shouldInject = true, initialPrompt } = options

  // Check if session already exists
  const exists = await sessionExists(name)
  if (exists) {
    // Session exists, get or create tracking
    let session = sessions.get(name)
    if (!session) {
      session = {
        name,
        beadsIssueId,
        spawnedAt: new Date().toISOString(),
        primed: false,
      }
      sessions.set(name, session)
    }

    // Re-inject context if requested
    if (shouldInject && beadsIssueId) {
      await reinjectContext(name, beadsIssueId)
    }

    return session
  }

  // Create new session
  const created = await createSession(name, options)
  if (!created) {
    throw new Error(`Failed to create worker session: ${name}`)
  }

  // Wait a moment for the session to initialize
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Create session tracking
  const session: WorkerSession = {
    name,
    beadsIssueId,
    spawnedAt: new Date().toISOString(),
    primed: false,
  }

  // Inject beads context if requested
  if (shouldInject) {
    const context = await getBeadsContext(beadsIssueId)
    const xml = formatContextForWorker(context)

    // Build the full initial message
    let message = ''
    if (beadsIssueId) {
      message += `You are working on beads issue: ${beadsIssueId}\n\n`
    }
    message += `Task: ${task}\n\n`
    message += `Current beads context:\n${xml}`

    if (initialPrompt) {
      message += `\n\n${initialPrompt}`
    }

    const injected = await injectContext(name, message)
    if (injected) {
      session.lastContextInjection = new Date().toISOString()
      session.primed = true
    }
  } else if (initialPrompt) {
    // Just send the initial prompt without context
    await injectContext(name, initialPrompt)
    session.primed = true
  }

  sessions.set(name, session)
  return session
}

/**
 * Re-inject context into an existing session
 * Use this after detecting context compaction
 *
 * @param sessionName - Session to inject into
 * @param beadsIssueId - Issue ID for context
 * @returns true if injection succeeded
 */
export async function reinjectContext(
  sessionName: string,
  beadsIssueId?: string
): Promise<boolean> {
  const session = sessions.get(sessionName)
  if (!session) {
    console.warn(`[conductor] Session ${sessionName} not tracked`)
    return false
  }

  const context = await getBeadsContext(beadsIssueId || session.beadsIssueId)
  const xml = formatContextForWorker(context)

  const message = `[Context refresh] Here is the current beads context:\n\n${xml}`
  const success = await injectContext(sessionName, message)

  if (success) {
    session.lastContextInjection = new Date().toISOString()
  }

  return success
}

/**
 * Check if a session needs context re-injection
 * Detects context compaction by monitoring context percentage drops
 *
 * @param sessionName - Session to check
 * @returns true if context should be re-injected
 */
export async function needsContextReinject(sessionName: string): Promise<boolean> {
  const session = sessions.get(sessionName)
  if (!session) {
    return false
  }

  const currentPercent = await getContextPercent(sessionName)
  if (currentPercent === undefined) {
    return false
  }

  // Detect significant context drop (compaction occurred)
  if (
    session.lastContextPercent !== undefined &&
    session.lastContextPercent > currentPercent + 20
  ) {
    // Context dropped by more than 20%, likely compacted
    console.log(
      `[conductor] Session ${sessionName} context dropped from ${session.lastContextPercent}% to ${currentPercent}%`
    )
    session.lastContextPercent = currentPercent
    return true
  }

  session.lastContextPercent = currentPercent
  return false
}

/**
 * Monitor all tracked sessions and re-inject context as needed
 *
 * @returns Map of session names to whether they were re-injected
 */
export async function monitorAndReinject(): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>()

  for (const [name, session] of sessions) {
    const needsReinject = await needsContextReinject(name)
    if (needsReinject) {
      const success = await reinjectContext(name, session.beadsIssueId)
      results.set(name, success)
    } else {
      results.set(name, false)
    }
  }

  return results
}

/**
 * Get all tracked worker sessions
 */
export function getTrackedSessions(): Map<string, WorkerSession> {
  return new Map(sessions)
}

/**
 * Get a specific worker session
 */
export function getSession(name: string): WorkerSession | undefined {
  return sessions.get(name)
}

/**
 * Remove a session from tracking
 */
export function untrackSession(name: string): boolean {
  return sessions.delete(name)
}

/**
 * Kill a worker session and remove from tracking
 */
export async function killWorker(name: string): Promise<boolean> {
  try {
    await execAsync(`tmux kill-session -t "${name}"`)
    sessions.delete(name)
    return true
  } catch (error) {
    console.error(`[conductor] Failed to kill session ${name}:`, error)
    return false
  }
}

/**
 * List all active tmux sessions (not just tracked ones)
 */
export async function listTmuxSessions(): Promise<string[]> {
  try {
    const { stdout } = await execAsync('tmux list-sessions -F "#{session_name}"')
    return stdout.trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}

/**
 * Sync tracked sessions with actual tmux sessions
 * Removes tracking for sessions that no longer exist
 */
export async function syncSessions(): Promise<void> {
  const activeSessions = new Set(await listTmuxSessions())

  for (const [name] of sessions) {
    if (!activeSessions.has(name)) {
      console.log(`[conductor] Session ${name} no longer exists, removing from tracking`)
      sessions.delete(name)
    }
  }
}
