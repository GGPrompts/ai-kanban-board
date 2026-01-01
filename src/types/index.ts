// AI Kanban Board Types

export interface Board {
  id: string
  name: string
  description?: string
  columns: Column[]
  settings: BoardSettings
  createdAt: Date
  updatedAt: Date
}

export interface Column {
  id: string
  title: string
  color: string // Tailwind color class e.g., 'border-t-emerald-500'
  order: number
  wipLimit?: number // Work-in-progress limit
  isCollapsed?: boolean
  autoAssign?: {
    agent?: AgentType
    priority?: Priority
  }
}

export interface Task {
  id: string
  title: string
  description?: string
  columnId: string
  order: number
  priority: Priority
  labels: string[]

  // AI Agent integration
  agent?: AgentInfo

  // Chat thread (like AI Workspace)
  messages?: Message[]

  // Git integration
  git?: GitInfo

  // Code review
  diff?: DiffInfo

  // Metadata
  estimate?: string // e.g., "2h", "1d"
  dueDate?: Date
  assignee?: string
  activities?: TaskActivity[]
  createdAt: Date
  updatedAt: Date
}

export interface AgentInfo {
  type: AgentType
  status: AgentStatus
  sessionId?: string
  worktreePath?: string
  startedAt?: Date
  logs?: string[]
}

export interface GitInfo {
  worktree?: string        // Path to git worktree
  branch?: string          // Branch name
  baseBranch?: string      // Base branch (main/develop)
  prNumber?: number        // GitHub PR number
  prStatus?: 'draft' | 'open' | 'merged' | 'closed'
  prUrl?: string           // PR URL
  commits?: Commit[]       // Recent commits
}

export interface Commit {
  sha: string
  message: string
  author: string
  date: string
}

export interface DiffInfo {
  files: DiffFile[]
  status: 'pending' | 'approved' | 'changes_requested'
}

export interface DiffFile {
  path: string
  additions: number
  deletions: number
  hunks: string[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  model?: string
  toolUses?: ToolUse[]
}

export interface ToolUse {
  name: string
  input: Record<string, unknown>
  output?: string
}

export interface BoardSettings {
  theme?: string
  showEstimates?: boolean
  showAgentStatus?: boolean
  defaultAgent?: AgentType
  projectPath?: string // For cwd context
  syncToGitHub?: boolean
}

export type AgentType = 'claude-code' | 'gemini-cli' | 'codex' | 'copilot' | 'amp' | 'cursor' | 'custom'
export type AgentStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

// Column presets
export const COLUMN_PRESETS = {
  ideas: { title: 'Ideas', color: 'border-t-purple-500' },
  triage: { title: 'Triage', color: 'border-t-orange-500' },
  backlog: { title: 'Backlog', color: 'border-t-slate-500' },
  spec: { title: 'Spec', color: 'border-t-blue-500' },
  ready: { title: 'Ready', color: 'border-t-cyan-500' },
  inProgress: { title: 'In Progress', color: 'border-t-yellow-500' },
  aiWorking: { title: 'AI Working', color: 'border-t-emerald-500' },
  review: { title: 'Review', color: 'border-t-pink-500' },
  qa: { title: 'QA', color: 'border-t-indigo-500' },
  done: { title: 'Done', color: 'border-t-green-500' },
  deployed: { title: 'Deployed', color: 'border-t-teal-500' },
  blocked: { title: 'Blocked', color: 'border-t-red-500' },
} as const

export const COLUMN_COLORS = [
  'border-t-emerald-500',
  'border-t-cyan-500',
  'border-t-blue-500',
  'border-t-purple-500',
  'border-t-pink-500',
  'border-t-red-500',
  'border-t-orange-500',
  'border-t-yellow-500',
  'border-t-green-500',
  'border-t-teal-500',
  'border-t-indigo-500',
  'border-t-slate-500',
] as const

export const PRIORITY_COLORS: Record<Priority, string> = {
  low: 'bg-slate-500',
  medium: 'bg-blue-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
}

// Task activity for timeline
export interface TaskActivity {
  id: string
  type: 'created' | 'updated' | 'moved' | 'commented'
  description: string
  timestamp: Date
}
