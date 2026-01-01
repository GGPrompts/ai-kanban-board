"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { motion, AnimatePresence } from "framer-motion"
import {
  GripVertical,
  Bot,
  GitBranch,
  GitPullRequest,
  Sparkles,
  Gem,
  Code2,
  Github,
  Zap,
  MousePointer2,
  FileText,
  Pencil,
  Terminal,
  Search,
  Circle,
  MessageSquare,
} from "lucide-react"
import { Task, AgentType, PRIORITY_COLORS, AGENT_META, AGENT_STATUS_META } from "@/types"
import { useBoardStore } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const PR_STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-500",
  open: "bg-emerald-500",
  merged: "bg-purple-500",
  closed: "bg-red-500",
}

// Icon mapping for agent types
const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Gem,
  Code2,
  Github,
  Zap,
  MousePointer2,
  Bot,
}

// Tool icons for activity display
const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Read: FileText,
  Edit: Pencil,
  Bash: Terminal,
  Grep: Search,
  Glob: Search,
  Write: Pencil,
  default: Terminal,
}

interface KanbanCardProps {
  task: Task
  isOverlay?: boolean
  columnAgent?: AgentType // Agent assigned to the parent column
}

export function KanbanCard({ task, isOverlay = false, columnAgent }: KanbanCardProps) {
  const setSelectedTask = useBoardStore((state) => state.setSelectedTask)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "task",
      task,
    },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const handleClick = (e: React.MouseEvent) => {
    // Don't open modal if dragging
    if (isDragging) return
    // Don't open if clicking on the drag handle
    if ((e.target as HTMLElement).closest("[data-drag-handle]")) return
    setSelectedTask(task.id)
  }

  // Check if PR is ready for review (open status)
  const hasPRReadyForReview = task.git?.prStatus === "open"

  // Determine effective agent (task agent or inherited from column)
  const effectiveAgent = task.agent?.type || columnAgent
  const agentMeta = effectiveAgent ? AGENT_META[effectiveAgent] : null
  const AgentIcon = agentMeta ? AGENT_ICONS[agentMeta.icon] || Bot : null
  const isAgentRunning = task.agent?.status === "running"

  // Get last activity info
  const lastActivity = task.agent?.lastActivity
  const ToolIcon = lastActivity?.tool
    ? TOOL_ICONS[lastActivity.tool] || TOOL_ICONS.default
    : null

  // Get accent color for the card
  const cardAccent = agentMeta
    ? `hsl(var(--agent-${effectiveAgent === 'claude-code' ? 'claude' : effectiveAgent}))`
    : undefined

  // Render overlay version (shown during drag)
  if (isOverlay) {
    return (
      <div
        className="kanban-card p-3 border-glow opacity-90 rotate-3"
        style={{ '--card-accent': cardAccent } as React.CSSProperties}
        data-has-agent={!!effectiveAgent}
      >
        <CardContent task={task} agentMeta={agentMeta} AgentIcon={AgentIcon} />
      </div>
    )
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={{
        ...style,
        '--card-accent': cardAccent,
      } as React.CSSProperties}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      data-has-agent={!!effectiveAgent}
      className={cn(
        "kanban-card group relative p-3",
        isDragging && "opacity-50 scale-[1.02] border-glow",
        hasPRReadyForReview && "ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-500/10",
        isAgentRunning && "agent-active"
      )}
      onClick={handleClick}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        data-drag-handle
        className="absolute left-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-50 cursor-grab active:cursor-grabbing transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-zinc-400" />
      </div>

      <div className="pl-4">
        <CardContent
          task={task}
          agentMeta={agentMeta}
          AgentIcon={AgentIcon}
          isRunning={isAgentRunning}
          lastActivity={lastActivity}
          ToolIcon={ToolIcon}
          columnAgent={columnAgent}
        />
      </div>
    </motion.div>
  )
}

interface CardContentProps {
  task: Task
  agentMeta: typeof AGENT_META[keyof typeof AGENT_META] | null
  AgentIcon: React.ComponentType<{ className?: string }> | null
  isRunning?: boolean
  lastActivity?: import('@/types').AgentActivity
  ToolIcon?: React.ComponentType<{ className?: string }> | null
  columnAgent?: AgentType
}

function CardContent({
  task,
  agentMeta,
  AgentIcon,
  isRunning,
  lastActivity,
  ToolIcon,
  columnAgent,
}: CardContentProps) {
  const hasTaskAgent = !!task.agent
  const inheritedFromColumn = !hasTaskAgent && !!columnAgent

  return (
    <>
      {/* Title */}
      <h4 className="text-sm font-medium text-zinc-100 leading-tight mb-2 line-clamp-2">
        {task.title}
      </h4>

      {/* Metadata row */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Priority badge */}
        <span
          className={cn(
            "inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded text-white uppercase tracking-wide mono",
            PRIORITY_COLORS[task.priority]
          )}
        >
          {task.priority}
        </span>

        {/* Labels */}
        {task.labels.slice(0, 2).map((label) => (
          <Badge
            key={label}
            variant="outline"
            className="text-[10px] px-1.5 py-0 h-5 bg-white/5 border-white/10 text-zinc-400"
          >
            {label}
          </Badge>
        ))}
        {task.labels.length > 2 && (
          <span className="text-[10px] text-zinc-500">
            +{task.labels.length - 2}
          </span>
        )}
      </div>

      {/* Agent Status - Enhanced */}
      {agentMeta && AgentIcon && (
        <div className={cn(
          "flex items-center gap-2 mt-2.5 p-2 rounded-md",
          isRunning
            ? "bg-emerald-500/10 border border-emerald-500/20"
            : "bg-zinc-800/50"
        )}>
          <div className={cn(
            "size-6 rounded flex items-center justify-center",
            agentMeta.bgColor
          )}>
            <AgentIcon className={cn("h-3.5 w-3.5", agentMeta.color)} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className={cn("text-xs font-medium", agentMeta.color)}>
                {agentMeta.shortLabel}
              </span>
              {inheritedFromColumn && (
                <span className="text-[9px] text-zinc-600 mono">(station)</span>
              )}
              {task.agent && (
                <span
                  className={cn(
                    "size-1.5 rounded-full ml-auto",
                    AGENT_STATUS_META[task.agent.status].bgColor,
                    isRunning && "animate-pulse"
                  )}
                  title={task.agent.status}
                />
              )}
            </div>

            {/* Activity preview when running */}
            <AnimatePresence>
              {isRunning && lastActivity && ToolIcon && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-1.5 mt-1"
                >
                  <ToolIcon className="h-2.5 w-2.5 text-zinc-500" />
                  <span className="text-[10px] text-zinc-500 truncate mono">
                    {lastActivity.summary}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Running indicator without specific activity */}
            {isRunning && !lastActivity && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex gap-0.5">
                  <span className="size-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="size-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="size-1 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[10px] text-zinc-500 mono">processing</span>
              </div>
            )}
          </div>

          {/* Chat indicator */}
          {task.messages && task.messages.length > 0 && (
            <div className="flex items-center gap-1 text-zinc-600">
              <MessageSquare className="h-3 w-3" />
              <span className="text-[10px] mono">{task.messages.length}</span>
            </div>
          )}
        </div>
      )}

      {/* Git indicator */}
      {task.git?.branch && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-500">
          <GitBranch className="h-3 w-3" />
          <span className="truncate max-w-24 mono text-[10px]">{task.git.branch}</span>
          {task.git.prNumber && (
            <div className="flex items-center gap-1 ml-auto">
              <GitPullRequest className="h-3 w-3" />
              <span className="text-zinc-400 mono text-[10px]">#{task.git.prNumber}</span>
              {task.git.prStatus && (
                <span
                  className={cn(
                    "size-2 rounded-full",
                    PR_STATUS_COLORS[task.git.prStatus]
                  )}
                  title={task.git.prStatus}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Estimate */}
      {task.estimate && (
        <div className="text-[10px] text-zinc-600 mt-1.5 mono">
          Est: {task.estimate}
        </div>
      )}
    </>
  )
}
