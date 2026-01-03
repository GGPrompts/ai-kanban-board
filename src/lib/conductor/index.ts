/**
 * Conductor Module
 * Orchestration utilities for spawning and managing Claude Code workers
 * with beads issue tracker context injection
 */

// Context injection
export {
  getBeadsContext,
  formatContextForWorker,
  injectContext,
  injectBeadsContextToSession,
  type BeadsContext,
} from './context'

// Worker management
export {
  spawnWorkerWithContext,
  reinjectContext,
  needsContextReinject,
  monitorAndReinject,
  getTrackedSessions,
  getSession,
  untrackSession,
  killWorker,
  listTmuxSessions,
  syncSessions,
  type WorkerSession,
  type SpawnOptions,
} from './worker'
