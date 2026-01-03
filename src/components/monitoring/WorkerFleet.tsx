'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  Activity,
  CheckCircle,
  DollarSign,
  RefreshCw,
  Plus,
  Filter,
} from 'lucide-react'
import { WorkerStatusCard } from './WorkerStatusCard'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { WorkerInfo, WorkerStatus, FleetMetrics } from '@/types/monitoring'

interface WorkerFleetProps {
  workers: WorkerInfo[]
  metrics?: FleetMetrics
  onWorkerClick?: (worker: WorkerInfo) => void
  onRefresh?: () => void
  onSpawnWorker?: () => void
  isLoading?: boolean
  selectedWorkerId?: string
}

type StatusFilter = 'all' | WorkerStatus

/**
 * WorkerFleet displays a grid of worker status cards with real-time updates
 * Based on Agent Fleet pattern from ai-agent-dashboard
 */
export function WorkerFleet({
  workers,
  metrics,
  onWorkerClick,
  onRefresh,
  onSpawnWorker,
  isLoading = false,
  selectedWorkerId,
}: WorkerFleetProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Filter workers by status
  const filteredWorkers = useMemo(() => {
    if (statusFilter === 'all') return workers
    return workers.filter((w) => w.status === statusFilter)
  }, [workers, statusFilter])

  // Count workers by status
  const statusCounts = useMemo(() => {
    return workers.reduce(
      (acc, w) => {
        acc[w.status] = (acc[w.status] || 0) + 1
        return acc
      },
      {} as Record<WorkerStatus, number>
    )
  }, [workers])

  // Calculate metrics if not provided
  const displayMetrics: FleetMetrics = metrics || {
    totalWorkers: workers.length,
    activeWorkers: workers.filter((w) => w.status === 'busy').length,
    totalTasksCompleted: workers.reduce((acc, w) => acc + w.tasksCompleted, 0),
    avgSuccessRate:
      workers.length > 0
        ? workers.reduce((acc, w) => acc + w.successRate, 0) / workers.length
        : 0,
    totalCost: workers.reduce(
      (acc, w) => acc + (w.tokenUsage?.totalCost || 0),
      0
    ),
    avgCostPerTask: 0.038, // Default estimate
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {/* Total Workers */}
        <div className="glass border-primary/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Total Workers</p>
            <Users className="h-4 w-4 text-primary/50" />
          </div>
          <p className="text-2xl font-bold text-primary font-mono">
            {displayMetrics.totalWorkers}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {displayMetrics.activeWorkers} active
          </p>
        </div>

        {/* Tasks Completed */}
        <div className="glass border-secondary/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Completed</p>
            <CheckCircle className="h-4 w-4 text-secondary/50" />
          </div>
          <p className="text-2xl font-bold text-secondary font-mono">
            {displayMetrics.totalTasksCompleted}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            {(displayMetrics.avgSuccessRate * 100).toFixed(0)}% success rate
          </p>
        </div>

        {/* Active Workers */}
        <div className="glass border-emerald-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Active Now</p>
            <Activity className="h-4 w-4 text-emerald-400/50" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-mono">
            {displayMetrics.activeWorkers}
          </p>
          <div className="mt-1 flex gap-1">
            {displayMetrics.activeWorkers > 0 && (
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-1.5 h-1.5 bg-emerald-400 rounded-full"
              />
            )}
            <span className="text-[10px] text-muted-foreground">
              processing tasks
            </span>
          </div>
        </div>

        {/* Cost Today */}
        <div className="glass border-amber-500/30 p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-muted-foreground">Cost Today</p>
            <DollarSign className="h-4 w-4 text-amber-400/50" />
          </div>
          <p className="text-2xl font-bold text-amber-400 font-mono">
            ${displayMetrics.totalCost.toFixed(2)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">
            ${displayMetrics.avgCostPerTask.toFixed(3)}/task avg
          </p>
        </div>
      </motion.div>

      {/* Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Status Filters */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1">
            {(['all', 'busy', 'idle', 'error', 'offline'] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    'px-2 py-1 rounded text-xs font-medium transition-all',
                    statusFilter === status
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                  )}
                >
                  {status === 'all'
                    ? 'All'
                    : `${status.charAt(0).toUpperCase() + status.slice(1)}`}
                  {status !== 'all' && statusCounts[status] > 0 && (
                    <span className="ml-1 opacity-70">
                      ({statusCounts[status]})
                    </span>
                  )}
                </button>
              )
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs',
                'bg-muted/30 text-muted-foreground hover:bg-muted/50',
                'transition-all',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', isLoading && 'animate-spin')}
              />
              Refresh
            </button>
          )}
          {onSpawnWorker && (
            <button
              onClick={onSpawnWorker}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs',
                'bg-primary/20 text-primary border border-primary/30',
                'hover:bg-primary/30 transition-all'
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              Spawn Worker
            </button>
          )}
        </div>
      </div>

      {/* Worker Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredWorkers.map((worker, idx) => (
            <motion.div
              key={worker.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              layout
            >
              <WorkerStatusCard
                worker={worker}
                onClick={() => onWorkerClick?.(worker)}
                isSelected={selectedWorkerId === worker.id}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {filteredWorkers.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-dark border-primary/20 rounded-lg p-12 text-center"
        >
          <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">
            No Workers Found
          </h3>
          <p className="text-sm text-muted-foreground/60">
            {statusFilter !== 'all'
              ? `No workers with status "${statusFilter}"`
              : 'Spawn a worker to get started'}
          </p>
          {onSpawnWorker && (
            <button
              onClick={onSpawnWorker}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 transition-all"
            >
              <Plus className="h-4 w-4" />
              Spawn First Worker
            </button>
          )}
        </motion.div>
      )}

      {/* Live Indicator */}
      {displayMetrics.activeWorkers > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed bottom-8 right-8 glass border-primary/30 rounded-full px-4 py-2 flex items-center gap-2 z-50"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-2 h-2 bg-primary rounded-full"
          />
          <span className="text-primary text-sm font-mono">Live</span>
        </motion.div>
      )}
    </div>
  )
}
