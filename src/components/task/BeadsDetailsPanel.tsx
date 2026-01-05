"use client"

import { useState, useEffect, useCallback } from "react"
import { motion } from "framer-motion"
import {
  Link2,
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Tag,
  User,
  MessageSquare,
  RefreshCw,
  Bug,
  Sparkles,
  Wrench,
  FileText,
  TestTube,
  RotateCcw,
} from "lucide-react"
import { Task } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { BeadsIssue, BeadsType, BeadsUpdatePayload } from "@/lib/beads/types"

interface BeadsDetailsPanelProps {
  task: Task
  onUpdate?: (updates: Partial<Task>) => void
  className?: string
}

// Type icons
const TYPE_ICONS: Record<BeadsType, typeof Bug> = {
  feature: Sparkles,
  bug: Bug,
  chore: Wrench,
  docs: FileText,
  test: TestTube,
  refactor: RotateCcw,
}

// Beads types array
const BEADS_TYPES: BeadsType[] = ["feature", "bug", "chore", "docs", "test", "refactor"]

export function BeadsDetailsPanel({ task, onUpdate: _onUpdate, className }: BeadsDetailsPanelProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [beadsDetails, setBeadsDetails] = useState<BeadsIssue | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")

  // Check if this is a beads task
  const isBeadsTask = task.beadsMetadata?.isBeadsTask || /^[a-z]+-[a-z0-9]+$/i.test(task.id)

  // Fetch full beads details
  const fetchBeadsDetails = useCallback(async () => {
    if (!isBeadsTask) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/beads/issues/${task.id}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to fetch beads details")
      }
      const data = await res.json()
      // Handle both wrapped and direct response
      setBeadsDetails(data.issue || data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch details")
    } finally {
      setIsLoading(false)
    }
  }, [task.id, isBeadsTask])

  // Fetch on mount if beads task
  useEffect(() => {
    if (isBeadsTask) {
      fetchBeadsDetails()
    }
  }, [isBeadsTask, fetchBeadsDetails])

  // Update beads issue
  const updateBeadsField = async (updates: BeadsUpdatePayload) => {
    setIsUpdating(true)
    setError(null)

    try {
      const res = await fetch(`/api/beads/issues/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to update")
      }

      // Refresh details
      await fetchBeadsDetails()
      setEditingField(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle type change
  const handleTypeChange = async (newType: BeadsType) => {
    await updateBeadsField({ type: newType })
  }

  // Handle assignee edit
  const handleAssigneeSubmit = async () => {
    await updateBeadsField({ assignee: editValue || undefined })
  }

  if (!isBeadsTask) {
    return (
      <div className={cn("p-4 glass-dark rounded-lg", className)}>
        <p className="text-sm text-zinc-500 text-center">
          This task is not from beads issue tracker
        </p>
      </div>
    )
  }

  if (isLoading && !beadsDetails) {
    return (
      <div className={cn("p-4 glass-dark rounded-lg", className)}>
        <div className="flex items-center justify-center gap-2 text-zinc-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span className="text-sm">Loading beads details...</span>
        </div>
      </div>
    )
  }

  // Use beadsDetails if available, fallback to task data
  const details = beadsDetails || {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.beadsMetadata?.beadsStatus || "open",
    priority: task.priority === "urgent" ? 1 : task.priority === "high" ? 2 : task.priority === "medium" ? 3 : 4,
    type: task.beadsMetadata?.type,
    labels: task.labels,
    blockedBy: task.blockedBy,
    blocks: task.blocking,
    assignee: task.assignee,
    closeReason: task.beadsMetadata?.closeReason,
    createdAt: task.createdAt?.toISOString(),
    updatedAt: task.updatedAt?.toISOString(),
  } as BeadsIssue

  const TypeIcon = details.type ? TYPE_ICONS[details.type] : Tag

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("space-y-4", className)}
    >
      {/* Header with beads ID */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-mono text-xs">
            {task.id}
          </Badge>
          {details.status && (
            <Badge
              variant="outline"
              className={cn(
                "text-xs capitalize",
                details.status === "closed" || details.status === "done"
                  ? "bg-green-500/10 text-green-400 border-green-500/30"
                  : details.status === "blocked"
                  ? "bg-red-500/10 text-red-400 border-red-500/30"
                  : details.status === "in_progress" || details.status === "in-progress"
                  ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/30"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/30"
              )}
            >
              {details.status.replace(/_/g, " ")}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-zinc-500 hover:text-zinc-300"
          onClick={fetchBeadsDetails}
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
        </Button>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-2 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Type selector */}
      <div className="space-y-2">
        <label className="text-xs text-zinc-500 uppercase tracking-wide flex items-center gap-1">
          <TypeIcon className="h-3 w-3" />
          Type
        </label>
        <Select
          value={details.type || ""}
          onValueChange={(value) => handleTypeChange(value as BeadsType)}
          disabled={isUpdating}
        >
          <SelectTrigger className="bg-black/20 border-white/10 focus:border-emerald-500/50">
            <SelectValue placeholder="Select type">
              {details.type && (
                <div className="flex items-center gap-2">
                  {(() => {
                    const Icon = TYPE_ICONS[details.type]
                    return <Icon className="h-3.5 w-3.5" />
                  })()}
                  <span className="capitalize">{details.type}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-zinc-900 border-white/10">
            {BEADS_TYPES.map((type) => {
              const Icon = TYPE_ICONS[type]
              return (
                <SelectItem key={type} value={type} className="hover:bg-white/5">
                  <div className="flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5" />
                    <span className="capitalize">{type}</span>
                  </div>
                </SelectItem>
              )
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Assignee */}
      <div className="space-y-2">
        <label className="text-xs text-zinc-500 uppercase tracking-wide flex items-center gap-1">
          <User className="h-3 w-3" />
          Assignee
        </label>
        {editingField === "assignee" ? (
          <div className="flex gap-2">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="bg-black/20 border-white/10 focus:border-emerald-500/50 text-zinc-100 h-8 text-sm"
              placeholder="Enter assignee..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAssigneeSubmit()
                if (e.key === "Escape") setEditingField(null)
              }}
            />
            <Button
              size="sm"
              className="h-8 px-2"
              onClick={handleAssigneeSubmit}
              disabled={isUpdating}
            >
              Save
            </Button>
          </div>
        ) : (
          <div
            className="p-2 rounded bg-black/20 border border-white/10 text-sm text-zinc-300 cursor-pointer hover:border-emerald-500/30 transition-colors"
            onClick={() => {
              setEditValue(details.assignee || "")
              setEditingField("assignee")
            }}
          >
            {details.assignee || <span className="text-zinc-500">Unassigned</span>}
          </div>
        )}
      </div>

      {/* Dependencies Section */}
      <div className="space-y-3 pt-2 border-t border-white/5">
        <label className="text-xs text-zinc-500 uppercase tracking-wide flex items-center gap-1">
          <Link2 className="h-3 w-3" />
          Dependencies
        </label>

        {/* Blocked By */}
        {details.blockedBy && details.blockedBy.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-xs text-red-400">
              <Lock className="h-3 w-3" />
              <span>Blocked by</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {details.blockedBy.map((id) => (
                <Badge
                  key={id}
                  variant="outline"
                  className="bg-red-500/10 text-red-400 border-red-500/30 font-mono text-xs cursor-pointer hover:bg-red-500/20 transition-colors"
                >
                  {id}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Blocks */}
        {details.blocks && details.blocks.length > 0 && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 text-xs text-amber-400">
              <Unlock className="h-3 w-3" />
              <span>Blocks</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {details.blocks.map((id) => (
                <Badge
                  key={id}
                  variant="outline"
                  className="bg-amber-500/10 text-amber-400 border-amber-500/30 font-mono text-xs cursor-pointer hover:bg-amber-500/20 transition-colors"
                >
                  {id}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* No dependencies */}
        {(!details.blockedBy || details.blockedBy.length === 0) &&
          (!details.blocks || details.blocks.length === 0) && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              <span>No dependencies</span>
            </div>
          )}
      </div>

      {/* Close Reason (only if closed) */}
      {(details.status === "closed" || details.status === "done") && (
        <div className="space-y-2 pt-2 border-t border-white/5">
          <label className="text-xs text-zinc-500 uppercase tracking-wide flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            Close Reason
          </label>
          <div className="p-2 rounded bg-green-500/5 border border-green-500/20 text-sm text-zinc-300">
            {details.closeReason || <span className="text-zinc-500 italic">No reason provided</span>}
          </div>
        </div>
      )}

      {/* Metadata footer */}
      <div className="pt-2 border-t border-white/5 text-xs text-zinc-500 space-y-1">
        {details.createdAt && (
          <div>Created: {new Date(details.createdAt).toLocaleDateString()}</div>
        )}
        {details.updatedAt && (
          <div>Updated: {new Date(details.updatedAt).toLocaleDateString()}</div>
        )}
      </div>
    </motion.div>
  )
}
