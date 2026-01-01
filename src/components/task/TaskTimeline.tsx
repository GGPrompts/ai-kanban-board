"use client"

import { motion } from "framer-motion"
import { Plus, Pencil, ArrowRight, MessageSquare } from "lucide-react"
import { Task, TaskActivity } from "@/types"
import { cn } from "@/lib/utils"

interface TaskTimelineProps {
  task: Task
  className?: string
}

const ACTIVITY_ICONS = {
  created: Plus,
  updated: Pencil,
  moved: ArrowRight,
  commented: MessageSquare,
}

const ACTIVITY_COLORS = {
  created: "text-emerald-400 bg-emerald-500/20",
  updated: "text-blue-400 bg-blue-500/20",
  moved: "text-yellow-400 bg-yellow-500/20",
  commented: "text-purple-400 bg-purple-500/20",
}

function formatDate(date: Date): string {
  const d = new Date(date)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  })
}

export function TaskTimeline({ task, className }: TaskTimelineProps) {
  // Generate activities from task data if not present
  const activities: TaskActivity[] = task.activities || [
    {
      id: "created",
      type: "created",
      description: "Task created",
      timestamp: task.createdAt,
    },
    ...(task.updatedAt > task.createdAt
      ? [
          {
            id: "updated",
            type: "updated" as const,
            description: "Task updated",
            timestamp: task.updatedAt,
          },
        ]
      : []),
  ]

  // Sort by timestamp descending (most recent first)
  const sortedActivities = [...activities].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="text-sm font-medium text-zinc-300 terminal-glow">Activity</h3>

      {sortedActivities.length === 0 ? (
        <p className="text-sm text-zinc-500">No activity yet</p>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />

          {/* Activity items */}
          <div className="space-y-4">
            {sortedActivities.map((activity, index) => {
              const Icon = ACTIVITY_ICONS[activity.type]
              const colorClass = ACTIVITY_COLORS[activity.type]

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="relative flex items-start gap-3 pl-0"
                >
                  {/* Icon */}
                  <div
                    className={cn(
                      "relative z-10 flex items-center justify-center w-8 h-8 rounded-full",
                      colorClass
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pt-1">
                    <p className="text-sm text-zinc-300">{activity.description}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {formatDate(activity.timestamp)}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
