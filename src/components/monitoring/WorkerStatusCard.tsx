'use client'

import { motion } from 'framer-motion'
import {
  Bot,
  Sparkles,
  Cpu,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  Pause,
  Zap,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { WorkerInfo, WorkerStatus } from '@/types/monitoring'
import { AgentType, AGENT_META } from '@/types'

interface WorkerStatusCardProps {
  worker: WorkerInfo
  onClick?: () => void
  isSelected?: boolean
}

/**
 * Get status-specific styling
 */
const STATUS_CONFIG: Record<
  WorkerStatus,
  {
    color: string
    bgColor: string
    borderColor: string
    icon: typeof Bot
    pulseClass?: string
  }
> = {
  idle: {
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/20',
    borderColor: 'border-slate-500/30',
    icon: Pause,
  },
  busy: {
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
    borderColor: 'border-emerald-500/30',
    icon: Activity,
    pulseClass: 'status-running',
  },
  error: {
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/30',
    icon: AlertCircle,
  },
  offline: {
    color: 'text-zinc-500',
    bgColor: 'bg-zinc-500/20',
    borderColor: 'border-zinc-500/30',
    icon: Bot,
  },
}

/**
 * Get agent icon component
 */
function getAgentIcon(agentType: AgentType) {
  switch (agentType) {
    case 'claude-code':
      return Sparkles
    case 'codex':
      return Cpu
    default:
      return Bot
  }
}

/**
 * WorkerStatusCard displays real-time status for a worker session
 * Following patterns from ai-agent-dashboard template
 */
export function WorkerStatusCard({
  worker,
  onClick,
  isSelected = false,
}: WorkerStatusCardProps) {
  const statusConfig = STATUS_CONFIG[worker.status]
  const StatusIcon = statusConfig.icon
  const AgentIcon = getAgentIcon(worker.agentType)
  const agentMeta = AGENT_META[worker.agentType]

  // Format last activity time
  const formatLastActivity = (timestamp?: string) => {
    if (!timestamp) return 'No activity'
    const diff = Date.now() - new Date(timestamp).getTime()
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    return `${Math.floor(diff / 3600000)}h ago`
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className={cn(
        'glass p-4 cursor-pointer transition-all',
        'border-l-4',
        isSelected && 'ring-2 ring-primary/50',
        worker.status === 'busy' && 'animate-pulse-glow'
      )}
      style={{
        borderLeftColor: agentMeta?.color
          ? `hsl(var(--agent-${worker.agentType.replace('-', '')}))`
          : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-primary truncate">
            {worker.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {agentMeta?.shortLabel || worker.agentType}
          </p>
        </div>
        <AgentIcon
          className={cn('h-5 w-5 flex-shrink-0', agentMeta?.color)}
        />
      </div>

      {/* Status Badge */}
      <Badge
        className={cn(
          'mb-3 uppercase text-[10px] font-semibold',
          statusConfig.bgColor,
          statusConfig.color,
          statusConfig.borderColor,
          statusConfig.pulseClass
        )}
      >
        <StatusIcon className="h-3 w-3 mr-1" />
        {worker.status}
      </Badge>

      {/* Beads Issue Link */}
      {worker.beadsIssueId && (
        <div className="mb-3 text-xs">
          <span className="text-muted-foreground">Issue: </span>
          <span className="text-secondary font-mono">
            {worker.beadsIssueId}
          </span>
        </div>
      )}

      {/* Health Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Health</span>
          <span className="text-xs font-mono text-primary">
            {worker.health}%
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${worker.health}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className={cn(
              'h-full rounded-full',
              worker.health > 70
                ? 'bg-emerald-500'
                : worker.health > 40
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            )}
          />
        </div>
      </div>

      {/* Context Usage (if available) */}
      {worker.contextPercent !== undefined && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Context</span>
            <span className="text-xs font-mono text-secondary">
              {worker.contextPercent}%
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${worker.contextPercent}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className={cn(
                'h-full rounded-full',
                worker.contextPercent < 50
                  ? 'bg-emerald-500'
                  : worker.contextPercent < 80
                    ? 'bg-amber-500'
                    : 'bg-red-500'
              )}
            />
          </div>
        </div>
      )}

      {/* Separator */}
      <div className="h-px bg-border/30 my-3" />

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Queued
          </p>
          <p className="text-sm font-mono text-secondary">
            {worker.tasksQueued}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Done
          </p>
          <p className="text-sm font-mono text-primary">
            {worker.tasksCompleted}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Avg Time
          </p>
          <p className="text-sm font-mono text-foreground">
            {worker.avgDuration.toFixed(1)}s
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Success
          </p>
          <p className="text-sm font-mono text-foreground">
            {(worker.successRate * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Last Activity Footer */}
      <div className="mt-3 pt-3 border-t border-border/30">
        <p className="text-[10px] text-muted-foreground">
          Last active: {formatLastActivity(worker.lastActivity)}
        </p>
      </div>
    </motion.div>
  )
}
