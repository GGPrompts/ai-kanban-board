"use client"

import { Circle, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"
import { useBeadsHealth, type BeadsHealthStatus } from "@/hooks/useBeadsHealth"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface BeadsHealthIndicatorProps {
  className?: string
  showLabel?: boolean
}

/**
 * Status configuration for each health state
 */
const STATUS_CONFIG: Record<
  BeadsHealthStatus,
  {
    label: string
    description: string
    dotClass: string
    textClass: string
    filled: boolean
  }
> = {
  healthy: {
    label: "Connected",
    description: "Daemon running, sync working",
    dotClass: "text-emerald-500",
    textClass: "text-emerald-400",
    filled: true,
  },
  stale: {
    label: "Stale",
    description: "Daemon running but sync delayed",
    dotClass: "text-amber-500",
    textClass: "text-amber-400",
    filled: true,
  },
  offline: {
    label: "Offline",
    description: "Daemon not running",
    dotClass: "text-zinc-500",
    textClass: "text-zinc-500",
    filled: false,
  },
}

/**
 * Beads daemon health status indicator
 * Shows connection status with visual feedback
 */
export function BeadsHealthIndicator({
  className,
  showLabel = false,
}: BeadsHealthIndicatorProps) {
  const { status, isLoading, lastChecked, error, refresh, data } = useBeadsHealth()

  const config = STATUS_CONFIG[status]

  const formatTime = (date: Date | null) => {
    if (!date) return "Never"
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => refresh()}
          disabled={isLoading}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors",
            "hover:bg-zinc-800/50 focus:outline-none focus:ring-1 focus:ring-zinc-600",
            "disabled:opacity-50 disabled:cursor-wait",
            className
          )}
        >
          {isLoading ? (
            <RefreshCw className="h-3 w-3 text-zinc-500 animate-spin" />
          ) : (
            <Circle
              className={cn("h-3 w-3", config.dotClass)}
              fill={config.filled ? "currentColor" : "none"}
              strokeWidth={config.filled ? 0 : 2}
            />
          )}
          {showLabel && (
            <span className={cn("text-xs font-medium", config.textClass)}>
              {config.label}
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-[200px]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Circle
              className={cn("h-2.5 w-2.5", config.dotClass)}
              fill={config.filled ? "currentColor" : "none"}
              strokeWidth={config.filled ? 0 : 2}
            />
            <span className="text-xs font-medium">{config.label}</span>
          </div>
          <p className="text-xs text-zinc-400">{config.description}</p>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="border-t border-zinc-700 pt-1.5 mt-1.5">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Last check:</span>
              <span>{formatTime(lastChecked)}</span>
            </div>
            {data?.issueCount !== undefined && (
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Issues:</span>
                <span>{data.issueCount}</span>
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-600 italic">Click to refresh</p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Compact version for tight spaces (just the dot)
 */
export function BeadsHealthDot({ className }: { className?: string }) {
  const { status, isLoading } = useBeadsHealth()
  const config = STATUS_CONFIG[status]

  if (isLoading) {
    return <RefreshCw className={cn("h-2.5 w-2.5 text-zinc-500 animate-spin", className)} />
  }

  return (
    <Circle
      className={cn("h-2.5 w-2.5", config.dotClass, className)}
      fill={config.filled ? "currentColor" : "none"}
      strokeWidth={config.filled ? 0 : 2}
    />
  )
}
