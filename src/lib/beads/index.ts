/**
 * Beads CLI Integration
 *
 * Provides TypeScript bindings for the beads issue tracker CLI.
 *
 * @example
 * ```ts
 * import { listIssues, getReady, closeIssue } from '@/lib/beads'
 *
 * // List all issues
 * const { issues } = await listIssues()
 *
 * // Get issues ready for work
 * const { issues: ready } = await getReady()
 *
 * // Close an issue
 * await closeIssue('kanban-mo4', 'Implemented feature')
 * ```
 *
 * @packageDocumentation
 */

// Re-export all types
export type {
  BeadsIssue,
  BeadsPriority,
  BeadsStatus,
  BeadsType,
  BeadsDaemonHealth,
  BeadsListResponse,
  BeadsReadyResponse,
  BeadsBlockedResponse,
  BeadsShowResponse,
  BeadsUpdatePayload,
  BeadsError,
  BeadsResult,
} from './types'

// Re-export client functions and errors
export {
  // Core command
  bdCommand,

  // Helper functions
  listIssues,
  getReady,
  getBlocked,
  getIssue,
  updateIssue,
  closeIssue,
  createIssue,
  checkHealth,
  isBeadsAvailable,

  // Safe wrapper
  safe,

  // Error classes
  BeadsCliNotFoundError,
  BeadsCommandError,
} from './client'

// Re-export mappers
export {
  mapBeadsPriorityToKanban,
  mapKanbanPriorityToBeads,
  mapBeadsToTask,
  mapTaskToBeadsUpdate,
  mapColumnToBeadsStatus,
  findColumnForStatus,
  groupIssuesByColumn,
  isBeadsTask,
  DEFAULT_STATUS_COLUMN_MAP,
} from './mappers'
