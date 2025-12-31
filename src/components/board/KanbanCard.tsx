"use client"

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { motion } from "framer-motion"
import { GripVertical, Bot, GitBranch } from "lucide-react"
import { Task, PRIORITY_COLORS } from "@/types"
import { useBoardStore } from "@/lib/store"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface KanbanCardProps {
  task: Task
  isOverlay?: boolean
}

const AGENT_STATUS_COLORS: Record<string, string> = {
  idle: "bg-slate-500",
  running: "bg-emerald-500 animate-pulse",
  paused: "bg-yellow-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
}

export function KanbanCard({ task, isOverlay = false }: KanbanCardProps) {
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

  // Render overlay version (shown during drag)
  if (isOverlay) {
    return (
      <div className="kanban-card p-3 border-glow opacity-90 rotate-3">
        <CardContent task={task} />
      </div>
    )
  }

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "kanban-card group relative p-3",
        isDragging && "opacity-50 scale-[1.02] border-glow"
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
        <CardContent task={task} />
      </div>
    </motion.div>
  )
}

function CardContent({ task }: { task: Task }) {
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
            "inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded text-white uppercase tracking-wide",
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

      {/* Agent status */}
      {task.agent && (
        <div className="flex items-center gap-1.5 mt-2 text-xs text-zinc-400">
          <Bot className="h-3 w-3" />
          <span className="capitalize">{task.agent.type}</span>
          <span
            className={cn(
              "size-2 rounded-full ml-auto",
              AGENT_STATUS_COLORS[task.agent.status]
            )}
            title={task.agent.status}
          />
        </div>
      )}

      {/* Git indicator */}
      {task.git?.branch && (
        <div className="flex items-center gap-1 mt-2 text-xs text-zinc-500">
          <GitBranch className="h-3 w-3" />
          <span className="truncate max-w-24">{task.git.branch}</span>
        </div>
      )}

      {/* Estimate */}
      {task.estimate && (
        <div className="text-[10px] text-zinc-500 mt-1.5">
          Est: {task.estimate}
        </div>
      )}
    </>
  )
}
