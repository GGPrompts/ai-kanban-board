'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WorkerConnection, WorkerInfo } from '@/types/monitoring'
import { AGENT_META } from '@/types'

interface WorkerConnectionGraphProps {
  workers: WorkerInfo[]
  connections: WorkerConnection[]
  className?: string
}

/**
 * WorkerConnectionGraph displays dependencies and message flow between workers
 * Based on Agent Network visualization from ai-agent-dashboard
 */
export function WorkerConnectionGraph({
  workers,
  connections,
  className,
}: WorkerConnectionGraphProps) {
  // Get worker by ID
  const getWorker = (id: string) => workers.find((w) => w.id === id)

  if (connections.length === 0) {
    return (
      <div
        className={cn(
          'glass border-primary/30 p-8 text-center',
          className
        )}
      >
        <ArrowRight className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No connections yet</p>
        <p className="text-xs text-muted-foreground/50 mt-1">
          Workers will be connected when they share issues or handoff tasks
        </p>
      </div>
    )
  }

  return (
    <div className={cn('glass border-primary/30 p-4', className)}>
      <h3 className="font-semibold text-sm text-foreground mb-4 flex items-center gap-2">
        <ArrowRight className="h-4 w-4 text-primary" />
        Worker Connections
      </h3>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {connections.map((conn, idx) => {
            const fromWorker = getWorker(conn.from)
            const toWorker = getWorker(conn.to)

            if (!fromWorker || !toWorker) return null

            const fromMeta = AGENT_META[fromWorker.agentType]
            const toMeta = AGENT_META[toWorker.agentType]

            return (
              <motion.div
                key={`${conn.from}-${conn.to}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
                className="glass-dark border-primary/20 rounded-lg p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* From Worker */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        fromWorker.status === 'busy'
                          ? 'bg-emerald-400'
                          : 'bg-slate-400'
                      )}
                    />
                    <span
                      className={cn(
                        'font-medium text-sm truncate',
                        fromMeta?.color
                      )}
                    >
                      {fromWorker.name}
                    </span>
                  </div>

                  {/* Connection Line */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-12 h-px bg-gradient-to-r from-primary/50 to-secondary/50" />
                    <ChevronRight className="h-4 w-4 text-secondary" />
                    <div className="w-12 h-px bg-gradient-to-r from-secondary/50 to-primary/50" />
                  </div>

                  {/* To Worker */}
                  <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
                    <span
                      className={cn(
                        'font-medium text-sm truncate',
                        toMeta?.color
                      )}
                    >
                      {toWorker.name}
                    </span>
                    <div
                      className={cn(
                        'w-2 h-2 rounded-full flex-shrink-0',
                        toWorker.status === 'busy'
                          ? 'bg-emerald-400'
                          : 'bg-slate-400'
                      )}
                    />
                  </div>

                  {/* Connection Metrics */}
                  <div className="flex-shrink-0 text-right w-24">
                    <p className="text-secondary font-mono text-sm">
                      {conn.messages} msgs
                    </p>
                    <div className="mt-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${conn.strength * 100}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
