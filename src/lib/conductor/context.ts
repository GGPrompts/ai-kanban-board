/**
 * Conductor Context Injection
 * Utilities to inject beads context into conductor workers
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import {
  listIssues,
  getReady,
  getBlocked,
  getIssue,
  safe,
} from '../beads/client'
import type { BeadsIssue, BeadsPriority } from '../beads/types'

const execAsync = promisify(exec)

/**
 * Beads context for worker injection
 */
export interface BeadsContext {
  /** Issues ready for work */
  readyIssues: BeadsIssue[]
  /** Blocked issues with their blockers */
  blockedIssues: Array<{
    issue: BeadsIssue
    blockedBy: string[]
  }>
  /** Current task issue (if working on specific issue) */
  currentTask?: BeadsIssue
  /** In-progress issues */
  inProgressIssues: BeadsIssue[]
  /** Timestamp when context was fetched */
  fetchedAt: string
}

/**
 * Fetch current beads context for worker injection
 *
 * @param currentIssueId - Optional ID of the specific issue being worked on
 * @returns Full beads context with ready, blocked, and current task
 *
 * @example
 * ```ts
 * const context = await getBeadsContext('kanban-2pa')
 * console.log(`${context.readyIssues.length} issues ready`)
 * ```
 */
export async function getBeadsContext(
  currentIssueId?: string
): Promise<BeadsContext> {
  // Fetch all context in parallel
  const [readyResult, blockedResult, listResult, currentResult] =
    await Promise.all([
      safe(getReady)(),
      safe(getBlocked)(),
      safe(listIssues)({ status: 'in-progress' }),
      currentIssueId ? safe(getIssue)(currentIssueId) : Promise.resolve(null),
    ])

  const readyIssues = readyResult.success ? readyResult.data.issues : []
  const inProgressIssues = listResult.success ? listResult.data.issues : []

  // Build blocked issues with their blockers
  const blockedIssues: BeadsContext['blockedIssues'] = []
  if (blockedResult.success) {
    for (const issue of blockedResult.data.issues) {
      blockedIssues.push({
        issue,
        blockedBy: blockedResult.data.blockers[issue.id] || [],
      })
    }
  }

  // Get current task if specified
  let currentTask: BeadsIssue | undefined
  if (currentResult && currentResult.success) {
    currentTask = currentResult.data.issue
  }

  return {
    readyIssues,
    blockedIssues,
    inProgressIssues,
    currentTask,
    fetchedAt: new Date().toISOString(),
  }
}

/**
 * Escape XML special characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Format priority as numeric value for sorting
 */
function priorityToNumber(priority: BeadsPriority): number {
  // Handle numeric priorities directly
  if (typeof priority === 'number') {
    return priority
  }
  const map: Record<string, number> = {
    critical: 1,
    high: 2,
    medium: 3,
    low: 4,
  }
  return map[priority] || 5
}

/**
 * Format beads context as XML for Claude consumption
 *
 * @param context - Beads context to format
 * @returns XML string ready for injection
 *
 * @example
 * ```ts
 * const context = await getBeadsContext('kanban-2pa')
 * const xml = formatContextForWorker(context)
 * // <beads-context>...</beads-context>
 * ```
 */
export function formatContextForWorker(context: BeadsContext): string {
  const lines: string[] = ['<beads-context>']

  // Ready issues (sorted by priority)
  if (context.readyIssues.length > 0) {
    lines.push('  <ready-issues>')
    const sorted = [...context.readyIssues].sort(
      (a, b) => priorityToNumber(a.priority) - priorityToNumber(b.priority)
    )
    for (const issue of sorted) {
      const attrs = [
        `id="${escapeXml(issue.id)}"`,
        `priority="${priorityToNumber(issue.priority)}"`,
        `title="${escapeXml(issue.title)}"`,
      ]
      if (issue.type) {
        attrs.push(`type="${escapeXml(issue.type)}"`)
      }
      if (issue.estimate) {
        attrs.push(`estimate="${escapeXml(issue.estimate)}"`)
      }
      lines.push(`    <issue ${attrs.join(' ')} />`)
    }
    lines.push('  </ready-issues>')
  }

  // In-progress issues
  if (context.inProgressIssues.length > 0) {
    lines.push('  <in-progress-issues>')
    for (const issue of context.inProgressIssues) {
      const attrs = [
        `id="${escapeXml(issue.id)}"`,
        `title="${escapeXml(issue.title)}"`,
      ]
      if (issue.assignee) {
        attrs.push(`assignee="${escapeXml(issue.assignee)}"`)
      }
      if (issue.branch) {
        attrs.push(`branch="${escapeXml(issue.branch)}"`)
      }
      lines.push(`    <issue ${attrs.join(' ')} />`)
    }
    lines.push('  </in-progress-issues>')
  }

  // Blocked issues
  if (context.blockedIssues.length > 0) {
    lines.push('  <blocked-issues>')
    for (const { issue, blockedBy } of context.blockedIssues) {
      const attrs = [
        `id="${escapeXml(issue.id)}"`,
        `title="${escapeXml(issue.title)}"`,
        `blocked-by="${blockedBy.map(escapeXml).join(',')}"`,
      ]
      lines.push(`    <issue ${attrs.join(' ')} />`)
    }
    lines.push('  </blocked-issues>')
  }

  // Current task with full description
  if (context.currentTask) {
    const task = context.currentTask
    const attrs = [`issue-id="${escapeXml(task.id)}"`]
    if (task.priority) {
      attrs.push(`priority="${escapeXml(String(task.priority))}"`)
    }
    if (task.type) {
      attrs.push(`type="${escapeXml(task.type)}"`)
    }
    lines.push(`  <current-task ${attrs.join(' ')}>`)
    lines.push(`    <title>${escapeXml(task.title)}</title>`)
    if (task.description) {
      // Preserve description formatting but escape XML
      lines.push(
        `    <description><![CDATA[${task.description}]]></description>`
      )
    }
    if (task.labels && task.labels.length > 0) {
      lines.push(`    <labels>${task.labels.map(escapeXml).join(', ')}</labels>`)
    }
    if (task.blockedBy && task.blockedBy.length > 0) {
      lines.push(
        `    <depends-on>${task.blockedBy.map(escapeXml).join(', ')}</depends-on>`
      )
    }
    lines.push('  </current-task>')
  }

  lines.push('</beads-context>')
  return lines.join('\n')
}

/**
 * Inject context into a tmux session
 *
 * @param sessionName - tmux session/pane to send context to
 * @param context - Formatted context string (XML)
 * @returns true if injection succeeded
 *
 * @example
 * ```ts
 * const context = await getBeadsContext('kanban-2pa')
 * const xml = formatContextForWorker(context)
 * await injectContext('worker-1', xml)
 * ```
 */
export async function injectContext(
  sessionName: string,
  context: string
): Promise<boolean> {
  try {
    // Use tmux send-keys to inject the context
    // We wrap in a heredoc-style format for clean multi-line injection
    const escapedContext = context
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "'\\''")

    // Send as a paste to the session
    await execAsync(
      `tmux send-keys -t "${sessionName}" '${escapedContext}' Enter`,
      { timeout: 5000 }
    )

    return true
  } catch (error) {
    console.error(`[conductor] Failed to inject context to ${sessionName}:`, error)
    return false
  }
}

/**
 * Inject context with a wrapper message for Claude
 *
 * @param sessionName - tmux session name
 * @param context - BeadsContext to inject
 * @param message - Optional additional message to include
 * @returns true if injection succeeded
 */
export async function injectBeadsContextToSession(
  sessionName: string,
  context: BeadsContext,
  message?: string
): Promise<boolean> {
  const xml = formatContextForWorker(context)

  const fullMessage = message
    ? `${message}\n\n${xml}`
    : `Here is the current beads issue context:\n\n${xml}`

  return injectContext(sessionName, fullMessage)
}
