'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutGrid,
  Activity,
  Network,
  X,
  Minimize2,
  Maximize2,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WorkerFleet } from './WorkerFleet'
import { LiveActivityFeed } from './LiveActivityFeed'
import { WorkerConnectionGraph } from './WorkerConnectionGraph'
import { cn } from '@/lib/utils'
import {
  WorkerInfo,
  ActivityEvent,
  WorkerConnection,
  FleetMetrics,
} from '@/types/monitoring'

interface MonitoringPanelProps {
  workers: WorkerInfo[]
  events?: ActivityEvent[]
  connections?: WorkerConnection[]
  metrics?: FleetMetrics
  onWorkerClick?: (worker: WorkerInfo) => void
  onRefresh?: () => void
  onSpawnWorker?: () => void
  onClose?: () => void
  isLoading?: boolean
  isExpanded?: boolean
  onToggleExpand?: () => void
  className?: string
}

/**
 * MonitoringPanel provides a comprehensive view of worker status, activity, and connections
 * Combines patterns from ai-agent-dashboard for mission control experience
 */
export function MonitoringPanel({
  workers,
  events = [],
  connections = [],
  metrics,
  onWorkerClick,
  onRefresh,
  onSpawnWorker,
  onClose,
  isLoading = false,
  isExpanded = true,
  onToggleExpand,
  className,
}: MonitoringPanelProps) {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | undefined>()
  const [activeTab, setActiveTab] = useState('fleet')

  // Filter events for selected worker if any
  const filteredEvents = useMemo(() => {
    if (!selectedWorkerId) return events
    return events.filter((e) => e.workerId === selectedWorkerId)
  }, [events, selectedWorkerId])

  // Handle worker selection
  const handleWorkerClick = (worker: WorkerInfo) => {
    setSelectedWorkerId((prev) =>
      prev === worker.id ? undefined : worker.id
    )
    onWorkerClick?.(worker)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'glass-overlay flex flex-col',
        isExpanded ? 'h-[calc(100vh-8rem)]' : 'h-auto',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-xl font-mono font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent terminal-glow">
            Mission Control
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Worker orchestration & monitoring
          </p>
        </motion.div>

        <div className="flex items-center gap-2">
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-2 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              {isExpanded ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <div className="px-6 pt-4 overflow-x-auto">
          <TabsList className="glass border-primary/30 w-max">
            <TabsTrigger
              value="fleet"
              className="text-xs whitespace-nowrap gap-1.5"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Worker Fleet
            </TabsTrigger>
            <TabsTrigger
              value="activity"
              className="text-xs whitespace-nowrap gap-1.5"
            >
              <Activity className="h-3.5 w-3.5" />
              Activity Stream
              {events.length > 0 && (
                <span className="ml-1 text-[10px] opacity-70">
                  ({events.length})
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="network"
              className="text-xs whitespace-nowrap gap-1.5"
            >
              <Network className="h-3.5 w-3.5" />
              Connections
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {/* Worker Fleet Tab */}
          <TabsContent value="fleet" className="mt-0 h-full">
            <WorkerFleet
              workers={workers}
              metrics={metrics}
              onWorkerClick={handleWorkerClick}
              onRefresh={onRefresh}
              onSpawnWorker={onSpawnWorker}
              isLoading={isLoading}
              selectedWorkerId={selectedWorkerId}
            />
          </TabsContent>

          {/* Activity Stream Tab */}
          <TabsContent value="activity" className="mt-0 h-full">
            <div className="grid lg:grid-cols-3 gap-6 h-full">
              {/* Activity Feed */}
              <div className="lg:col-span-2">
                <LiveActivityFeed
                  events={filteredEvents}
                  title={
                    selectedWorkerId
                      ? `Activity for ${workers.find((w) => w.id === selectedWorkerId)?.name}`
                      : 'All Activity'
                  }
                  className="h-full"
                />
              </div>

              {/* Selected Worker Info */}
              <div className="lg:col-span-1">
                {selectedWorkerId ? (
                  <div className="glass border-secondary/30 p-4 space-y-4">
                    <h3 className="font-semibold text-sm text-secondary">
                      Selected Worker
                    </h3>
                    {(() => {
                      const worker = workers.find(
                        (w) => w.id === selectedWorkerId
                      )
                      if (!worker) return null
                      return (
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Name
                            </p>
                            <p className="text-sm font-mono text-foreground">
                              {worker.name}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Status
                            </p>
                            <p
                              className={cn(
                                'text-sm font-mono',
                                worker.status === 'busy'
                                  ? 'text-emerald-400'
                                  : worker.status === 'error'
                                    ? 'text-red-400'
                                    : 'text-slate-400'
                              )}
                            >
                              {worker.status.toUpperCase()}
                            </p>
                          </div>
                          {worker.beadsIssueId && (
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Issue
                              </p>
                              <p className="text-sm font-mono text-primary">
                                {worker.beadsIssueId}
                              </p>
                            </div>
                          )}
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/30">
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Tasks Done
                              </p>
                              <p className="text-lg font-mono text-primary">
                                {worker.tasksCompleted}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">
                                Success Rate
                              </p>
                              <p className="text-lg font-mono text-secondary">
                                {(worker.successRate * 100).toFixed(0)}%
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setSelectedWorkerId(undefined)}
                            className="w-full mt-2 px-3 py-1.5 text-xs rounded-md bg-muted/30 text-muted-foreground hover:bg-muted/50 transition-colors"
                          >
                            Clear Selection
                          </button>
                        </div>
                      )
                    })()}
                  </div>
                ) : (
                  <div className="glass-dark border-primary/20 p-8 text-center h-full flex flex-col items-center justify-center">
                    <Activity className="h-10 w-10 text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Select a worker
                    </p>
                    <p className="text-xs text-muted-foreground/50 mt-1">
                      Click on a worker card to filter activity
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Network Tab */}
          <TabsContent value="network" className="mt-0 h-full">
            <WorkerConnectionGraph
              workers={workers}
              connections={connections}
              className="h-full"
            />
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  )
}
