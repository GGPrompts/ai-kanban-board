# Beads Integration Patterns Report

Analysis of editor extensions and tools for integration into ai-kanban-board + conductor.

## Executive Summary

Beads is a distributed, git-backed graph issue tracker designed for AI agents. The key insight is that it provides **structured memory** for coding agents, replacing unstructured plans with a dependency-aware task graph. All tools integrate via the `bd` CLI with JSON output, not direct database access.

---

## 1. vscode-beads (TypeScript)

**Source:** https://github.com/jdillon/vscode-beads

### Architecture
- VS Code extension with Issues Panel + Details Panel
- Communicates exclusively via `bd` CLI (not direct daemon/socket)
- Auto-detects `.beads` directories in workspace

### Key Integration Patterns

```typescript
// Configuration options
{
  "beads.pathToBd": "/path/to/bd",      // Custom bd path
  "beads.autoStartDaemon": true,         // Auto-start daemon
  "beads.refreshInterval": 30000         // Polling interval (ms)
}
```

**Daemon Management:**
- Auto-start daemon on extension activation
- Auto-recover from stale sockets
- Status bar indicator shows daemon health
- Windows TCP socket support

**Data Operations:**
- All CRUD via `bd` CLI with `--json` flag
- Persistent UI state (column order, sorts, filters)
- Click-to-copy bead IDs

### Relevant for ai-kanban-board
- Status bar daemon health indicator pattern
- Filter presets (Not Closed, Blocked, Epics)
- Multi-column sorting with shift+click

---

## 2. opencode-beads (TypeScript/Node.js)

**Source:** https://github.com/joshuadavidthomas/opencode-beads

### Architecture
- OpenCode plugin wrapping `bd` CLI
- Three hooks: `chat.message`, `event`, `config`
- Session-aware context injection

### Key Integration Patterns

**Context Injection (Critical Pattern):**
```typescript
// Inject beads context on session start and after compaction
async function injectBeadsContext(session, triggerMessage) {
  // 1. Execute bd prime to get current state
  const context = await exec('bd prime --json');

  // 2. Wrap in XML tags for AI consumption
  const wrapped = `<beads-context>${context}</beads-context>`;

  // 3. Inject as synthetic noReply message
  await session.sendMessage({
    content: wrapped,
    noReply: true,
    model: triggerMessage.model,
    agent: triggerMessage.agent
  });
}
```

**Session State Management:**
```typescript
// Track which sessions have received context
const injectedSessions = new Set<string>();

// Check for existing context to handle reconnections
function hasExistingContext(messages) {
  return messages.some(m => m.content.includes('<beads-context>'));
}
```

**Task Agent Automation:**
```typescript
// beads-task-agent: Autonomous issue completion
// 1. Find ready work: bd ready --json
// 2. Claim task: bd update <id> --status in_progress --json
// 3. Execute work
// 4. Create discovered issues: bd create "title" --json
// 5. Close task: bd close <id> --reason "Done" --json
// 6. Repeat for newly unblocked tasks
```

### Agent Configuration (AGENTS.md patterns)
```bash
# JSON-first for programmatic consumption
bd ready --json
bd create "title" -p 1 --json
bd update <id> --status in_progress --json
bd close <id> --reason "Done" --json

# Dependency semantics: "Phase 2 needs Phase 1"
bd dep add phase2 phase1
```

### Relevant for ai-kanban-board + conductor
- **Context injection on session start** - prime conductor workers with board state
- **Compaction handling** - re-inject context after context window compression
- **Session tracking** - avoid duplicate context injection
- **Task agent loop** - autonomous work completion pattern

---

## 3. Beadster (Swift/macOS)

**Source:** https://github.com/beadster/beadster

### Architecture
- Native macOS app (100% Swift)
- Reads `.beads/` directories directly (no daemon dependency)
- File watching with FSEvents for live updates

### Key Integration Patterns

**Direct File Access:**
- Parses `.beads/issues.jsonl` directly
- Watches for file changes, auto-refreshes UI
- Offline-first, no cloud connectivity required

**Discovery:**
- Auto-discovers repositories containing `.beads/` directories
- Browses issues with status, priority, labels

### Relevant for ai-kanban-board
- **File watching pattern** - react to external changes
- **Offline-first** - localStorage persistence already in use
- **Auto-discovery** - find `.beads/` in workspace

---

## 4. beads.el (Emacs Lisp)

**Source:** https://codeberg.org/ctietze/beads.el

### Architecture
- Emacs client communicating via Unix socket RPC
- Requires running `bd daemon`
- Socket at `.beads/bd.sock`

### Key Integration Patterns

**Unix Socket RPC:**
```elisp
;; Connect to daemon socket
(setq beads-socket-path ".beads/bd.sock")

;; Send RPC request
(beads-rpc-call "list" '(:status "open"))
```

**Hierarchical Views:**
- Issue dependency tree rendering
- Parent-child relationships (epics/subtasks)
- Live preview with side-window display

**Filtering:**
- Status, priority, type, assignee, labels
- Ready issues (no blockers)
- Blocked issues

### Relevant for ai-kanban-board
- **Dependency tree visualization** - could enhance column views
- **Ready/blocked filtering** - priority-based task ordering

---

## 5. Beads Daemon Protocol

**Source:** https://github.com/steveyegge/beads/blob/main/docs/DAEMON.md

### Architecture

```
┌─────────────────────────────────────────────────┐
│                  Beads Daemon                   │
│  ┌───────────┐  ┌───────────┐  ┌─────────────┐ │
│  │  Watcher  │  │   Sync    │  │    RPC      │ │
│  │ (FSEvents)│  │  Ticker   │  │  Handler    │ │
│  └───────────┘  └───────────┘  └─────────────┘ │
│         │            │               │          │
│         ▼            ▼               ▼          │
│  ┌─────────────────────────────────────────┐   │
│  │            SQLite Cache                  │   │
│  └─────────────────────────────────────────┘   │
│                      │                          │
│                      ▼                          │
│  ┌─────────────────────────────────────────┐   │
│  │         .beads/issues.jsonl             │   │
│  └─────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
          │
          │ Unix Socket (.beads/bd.sock)
          │ Windows Named Pipe (.beads/bd.pipe)
          ▼
    ┌──────────────┐
    │   Clients    │
    │  (bd CLI,    │
    │  extensions) │
    └──────────────┘
```

### Socket Communication
- **Unix:** `.beads/bd.sock`
- **Windows:** `.beads/bd.pipe` (TCP fallback)
- One daemon per workspace (LSP-style architecture)

### Event-Driven Mode (default v0.21.0+)
```bash
# Performance characteristics
# - Sync latency: <500ms (vs ~5s polling)
# - CPU usage: ~0.5% idle (vs ~2-3% continuous)
# - Platform-native watchers (inotify/FSEvents/ReadDirectoryChangesW)
# - 500ms debounce window for batching
```

### Configuration
```bash
BEADS_DAEMON_MODE=events              # Default: event-driven
BEADS_DAEMON_MODE=poll                # Fallback: polling
BEADS_REMOTE_SYNC_INTERVAL=30s        # Git pull frequency
BEADS_WATCHER_FALLBACK=true           # Auto-fallback if events fail
BEADS_NO_DAEMON=true                  # CI/CD: disable daemon
```

### Daemon Management
```bash
bd daemons list --json      # View running daemons
bd daemons health --json    # Check for issues
bd daemons stop /path       # Stop specific daemon
bd daemons logs . -n 100    # View logs
bd daemons killall --force  # Stop all
```

---

## Integration Recommendations for ai-kanban-board + conductor

### 1. CLI-First Integration (Recommended)

All tools use `bd` CLI with `--json` flag. This is the safest integration path:

```typescript
// utils/beads.ts
import { exec } from 'child_process';

export async function bdCommand(cmd: string): Promise<any> {
  return new Promise((resolve, reject) => {
    exec(`bd ${cmd} --json`, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(JSON.parse(stdout));
    });
  });
}

// Usage
const readyTasks = await bdCommand('ready');
const created = await bdCommand('create "Task title" -p 1');
await bdCommand(`update ${id} --status in_progress`);
await bdCommand(`close ${id} --reason "Completed"`);
```

### 2. Context Injection Pattern (from opencode-beads)

For conductor workers, inject beads context at session start:

```typescript
// hooks/useBeadsContext.ts
async function primeWorkerContext(workerId: string) {
  // Get current board state as beads-compatible context
  const context = await bdCommand('prime');

  // Inject as system message
  await sendToWorker(workerId, {
    role: 'system',
    content: `<beads-context>\n${JSON.stringify(context, null, 2)}\n</beads-context>`,
    noReply: true
  });
}
```

### 3. Task Agent Loop (from opencode-beads)

Autonomous work pattern for conductor:

```typescript
// agents/task-agent.ts
async function taskAgentLoop() {
  while (true) {
    // 1. Find ready work
    const ready = await bdCommand('ready');
    if (ready.length === 0) break;

    // 2. Claim first task
    const task = ready[0];
    await bdCommand(`update ${task.id} --status in_progress`);

    // 3. Execute work (spawn worker)
    const result = await executeTask(task);

    // 4. Create discovered issues
    for (const issue of result.discovered) {
      await bdCommand(`create "${issue.title}" -p ${issue.priority}`);
    }

    // 5. Close task
    await bdCommand(`close ${task.id} --reason "${result.reason}"`);
  }
}
```

### 4. Kanban Column Mapping

Map beads statuses to kanban columns:

```typescript
const BEADS_TO_COLUMN: Record<string, string> = {
  'open': 'backlog',
  'in_progress': 'in-progress',
  'blocked': 'blocked',
  'review': 'review',
  'closed': 'done'
};

// Sync beads issues to kanban board
async function syncBeadsToBoard(board: Board) {
  const issues = await bdCommand('list');

  for (const issue of issues) {
    const columnId = BEADS_TO_COLUMN[issue.status] || 'backlog';
    await moveTaskToColumn(issue.id, columnId);
  }
}
```

### 5. Dependency Visualization

Leverage beads dependency graph for column ordering:

```typescript
// Show blocked tasks with visual indicator
interface TaskWithDeps extends Task {
  blockedBy: string[];  // IDs of blocking tasks
  blocks: string[];     // IDs of tasks this blocks
  isReady: boolean;     // No open blockers
}

// Fetch with dependencies
const taskWithDeps = await bdCommand(`show ${id}`);
```

### 6. Daemon Health Monitoring

Add status indicator (from vscode-beads):

```typescript
// components/BeadsDaemonStatus.tsx
function BeadsDaemonStatus() {
  const [health, setHealth] = useState<'healthy' | 'stale' | 'offline'>('offline');

  useEffect(() => {
    const checkHealth = async () => {
      try {
        await bdCommand('daemons health');
        setHealth('healthy');
      } catch {
        setHealth('offline');
      }
    };

    const interval = setInterval(checkHealth, 30000);
    checkHealth();
    return () => clearInterval(interval);
  }, []);

  return <StatusIndicator status={health} />;
}
```

---

## Key Takeaways

| Pattern | Source | Value for ai-kanban-board |
|---------|--------|---------------------------|
| CLI with `--json` | All tools | Consistent, reliable integration |
| Context injection on session start | opencode-beads | Prime conductor workers |
| Re-inject on compaction | opencode-beads | Handle long sessions |
| Task agent loop | opencode-beads | Autonomous work completion |
| Daemon health indicator | vscode-beads | User visibility |
| File watching | Beadster | React to external changes |
| Dependency tree | beads.el | Enhanced task visualization |
| Ready/blocked filters | All tools | Priority-based ordering |

## Implementation Priority

1. **CLI wrapper** - `bdCommand()` utility function
2. **Context injection** - Prime conductor workers with board state
3. **Task sync** - Map beads issues to kanban columns
4. **Status indicator** - Show daemon health in UI
5. **Dependency viz** - Show blockers on cards
6. **Task agent** - Autonomous work loop for conductor
