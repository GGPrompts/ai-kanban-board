'use client'

import { useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  CheckCircle,
  XCircle,
  Wrench,
  RefreshCw,
  Plus,
  Trash2,
  Activity,
  Clock,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { ActivityEvent } from '@/types/monitoring'

interface LiveActivityFeedProps {
  events: ActivityEvent[]
  maxItems?: number
  autoScroll?: boolean
  title?: string
  className?: string
}

/**
 * Get icon and color for activity type
 */
const ACTIVITY_CONFIG: Record<
  ActivityEvent['type'],
  { icon: typeof Activity; color: string; bgColor: string }
> = {
  task_started: {
    icon: Play,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
  },
  task_completed: {
    icon: CheckCircle,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/20',
  },
  task_failed: {
    icon: XCircle,
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
  },
  tool_use: {
    icon: Wrench,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/20',
  },
  context_refresh: {
    icon: RefreshCw,
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/20',
  },
  worker_spawn: {
    icon: Plus,
    color: 'text-primary',
    bgColor: 'bg-primary/20',
  },
  worker_kill: {
    icon: Trash2,
    color: 'text-zinc-400',
    bgColor: 'bg-zinc-500/20',
  },
}

/**
 * Format relative time from timestamp
 */
function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  if (diff < 5000) return 'Just now'
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return new Date(timestamp).toLocaleDateString()
}

/**
 * Single activity item in the feed
 */
function ActivityItem({ event }: { event: ActivityEvent }) {
  const config = ACTIVITY_CONFIG[event.type]
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.3 }}
      className="glass-dark border-primary/20 rounded-lg p-3 hover:bg-primary/5 transition-colors"
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
            config.bgColor
          )}
        >
          <Icon className={cn('h-4 w-4', config.color)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {event.workerName && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 text-secondary border-secondary/30"
              >
                {event.workerName}
              </Badge>
            )}
            {event.beadsIssueId && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 font-mono text-primary border-primary/30"
              >
                {event.beadsIssueId}
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground/80 mt-1 line-clamp-2">
            {event.summary}
          </p>
          <div className="flex items-center gap-1 mt-1.5">
            <Clock className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground/50">
              {formatRelativeTime(event.timestamp)}
            </span>
          </div>
        </div>

        {/* Running indicator */}
        {event.type === 'task_started' && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-2 h-2 bg-blue-400 rounded-full flex-shrink-0 mt-2"
          />
        )}
      </div>
    </motion.div>
  )
}

/**
 * LiveActivityFeed displays real-time activity stream for workers
 * Based on Live Task Stream pattern from ai-agent-dashboard
 */
export function LiveActivityFeed({
  events,
  maxItems = 50,
  autoScroll = true,
  title = 'Activity Stream',
  className,
}: LiveActivityFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0 // Scroll to top since newest is at top
    }
  }, [events.length, autoScroll])

  // Limit displayed events
  const displayEvents = events.slice(0, maxItems)

  // Group events by date for visual separation
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()

  return (
    <div className={cn('glass border-primary/30 flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/30">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">{title}</h3>
          {events.length > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground"
            >
              {events.length}
            </Badge>
          )}
        </div>
        {events.filter((e) => e.type === 'task_started').length > 0 && (
          <div className="flex items-center gap-1.5">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-2 h-2 bg-primary rounded-full"
            />
            <span className="text-xs text-primary font-mono">Live</span>
          </div>
        )}
      </div>

      {/* Events List */}
      <ScrollArea className="flex-1 h-[500px]" ref={scrollRef}>
        <div className="p-4 space-y-3">
          <AnimatePresence mode="popLayout">
            {displayEvents.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <Activity className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No activity yet
                </p>
                <p className="text-xs text-muted-foreground/50 mt-1">
                  Events will appear here as workers process tasks
                </p>
              </motion.div>
            ) : (
              displayEvents.map((event, idx) => (
                <ActivityItem key={event.id} event={event} />
              ))
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Footer */}
      {events.length > maxItems && (
        <div className="p-3 border-t border-border/30 text-center">
          <p className="text-xs text-muted-foreground">
            Showing {maxItems} of {events.length} events
          </p>
        </div>
      )}
    </div>
  )
}
