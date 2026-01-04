# AI Kanban Board

An AI agent orchestration kanban board with 5-10+ customizable columns, inline AI chat per task, and glass/terminal aesthetic.

## Quick Start

```bash
npm run dev  # Start dev server at http://localhost:3000
```

## Tech Stack

- **Next.js 16** + React 19 + TypeScript
- **Tailwind CSS v4** + shadcn/ui components
- **@dnd-kit** - Drag and drop (sortable + droppable)
- **Framer Motion** - Animations
- **Zustand** - State management
- **Lucide React** - Icons

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main board view
│   ├── globals.css           # Tailwind + glass effects
│   └── api/                  # API routes
├── components/
│   ├── board/                # KanbanBoard, KanbanColumn, KanbanCard
│   ├── task/                 # TaskModal, TaskChat, TaskDiff
│   ├── sidebar/              # BoardList, AgentPanel
│   ├── shared/               # AgentBadge, PriorityBadge
│   └── ui/                   # shadcn components
├── hooks/                    # useBoard, useTasks, useColumns, useDragDrop
├── lib/                      # utils, constants
└── types/                    # TypeScript definitions
```

## Design System

### Glass Effects (from ggprompts)

```css
/* Add to globals.css */
.glass {
  @apply bg-white/5 backdrop-blur-md border border-white/10 rounded-lg;
}

.glass-dark {
  @apply bg-black/40 backdrop-blur-md border border-white/10 rounded-lg;
}

.terminal-glow {
  text-shadow: 0 0 10px rgba(16, 185, 129, 0.5);
}

.border-glow {
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.3);
}
```

### Color Palette

- Primary: emerald-500 (#10b981)
- Accent: cyan-500 (#06b6d4)
- Background: Dark with subtle gradients
- Cards: glass effect with backdrop-blur

## Key Data Types

```typescript
interface Board {
  id: string
  name: string
  columns: Column[]
  settings: BoardSettings
}

interface Column {
  id: string
  title: string
  color: string        // e.g., 'border-t-emerald-500'
  order: number
  wipLimit?: number
}

interface Task {
  id: string
  title: string
  description?: string
  columnId: string
  order: number
  priority: 'low' | 'medium' | 'high' | 'urgent'
  labels: string[]
  agent?: AgentInfo
  messages?: Message[]
  git?: GitInfo
}
```

## Implementation Priority

### Phase 1: MVP Core (Current)
1. KanbanBoard container with DndContext
2. KanbanColumn with droppable zone
3. KanbanCard with draggable + glass styling
4. Column CRUD (add, edit, delete, reorder)
5. Task CRUD (add, edit, delete)
6. localStorage persistence

### Component Patterns

```tsx
// Always use glass styling
<div className="glass-dark min-w-80 flex flex-col rounded-lg">

// Column header with colored top border
<div className={cn("p-3 border-t-4", column.color)}>

// Cards with hover glow
<Card className="glass hover:border-glow cursor-grab">

// Framer Motion for smooth animations
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
>
```

## Column Presets

```typescript
const COLUMN_PRESETS = {
  ideas: { color: 'border-t-purple-500', icon: 'Lightbulb' },
  backlog: { color: 'border-t-slate-500', icon: 'Inbox' },
  ready: { color: 'border-t-cyan-500', icon: 'CheckCircle' },
  inProgress: { color: 'border-t-yellow-500', icon: 'Play' },
  aiWorking: { color: 'border-t-emerald-500', icon: 'Bot' },
  review: { color: 'border-t-pink-500', icon: 'Eye' },
  done: { color: 'border-t-green-500', icon: 'CheckCheck' },
}
```

## Don't

- Don't use generic styling - always glass effects
- Don't skip animations - use Framer Motion
- Don't hardcode columns - make them configurable
- Don't forget dark mode - design dark-first

---

## Parallel Worker Patterns

When spawning multiple Claude workers via conductor:

**Use git worktrees** - Workers in same directory cause conflicts:
```bash
git worktree add ../ai-kanban-board-feature branch-name
# Spawn worker with workingDir pointing to worktree
```

**Common worker issues observed:**
1. **Prompt doesn't submit** - Always use `sleep 0.3` before `C-m`
2. **Worker finishes but doesn't close issue** - Nudge with explicit `bd close` command
3. **Worker sits idle after commit** - May need reminder to close beads issue
4. **Workers conflict on same files** - Use worktrees for parallel work

**Nudging idle workers:**
```bash
# If worker has uncommitted changes but is idle
tmux send-keys -t "$SESSION" "npm run build && git add . && git commit -m 'message' && bd close ISSUE-ID --reason 'done'" Enter
```

### Beads Workflow

| Command | Purpose |
|---------|---------|
| `bd ready` | Show issues ready to work |
| `bd show <id>` | View issue details |
| `bd update <id> --status in_progress` | Claim issue |
| `bd close <id> --reason "..."` | Complete issue |
| `bd sync` | Sync with git remote |
| `/bd-swarm` | Spawn parallel workers |
| `/bd-status` | Show issue tracker overview |
