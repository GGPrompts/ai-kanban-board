'use client'

import { useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Puzzle,
  Server,
  Users,
  Terminal,
  GitBranch,
  GitPullRequest,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  X,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import { Task, AgentProfile, AgentCapabilities, TaskActiveCapabilities } from '@/types'
import { useBoardStore } from '@/lib/store'
import { useAgentProfileStore } from '@/lib/agent-store'
import { useState } from 'react'

interface CapabilityTogglePanelProps {
  task: Task
  className?: string
}

interface CapabilitySectionProps {
  title: string
  icon: React.ReactNode
  iconColor: string
  items: string[]
  activeItems: string[]
  onToggle: (item: string, enabled: boolean) => void
  onToggleAll: (enabled: boolean) => void
}

function CapabilitySection({
  title,
  icon,
  iconColor,
  items,
  activeItems,
  onToggle,
  onToggleAll,
}: CapabilitySectionProps) {
  const [isOpen, setIsOpen] = useState(true)
  const allEnabled = items.length > 0 && items.every((item) => activeItems.includes(item))
  const someEnabled = items.some((item) => activeItems.includes(item))

  if (items.length === 0) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger className="flex items-center gap-2 group">
          <div className={cn('p-1 rounded', iconColor)}>
            {icon}
          </div>
          <span className="text-xs font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">
            {title}
          </span>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 text-zinc-500 border-zinc-700">
            {activeItems.length}/{items.length}
          </Badge>
          {isOpen ? (
            <ChevronUp className="h-3 w-3 text-zinc-500" />
          ) : (
            <ChevronDown className="h-3 w-3 text-zinc-500" />
          )}
        </CollapsibleTrigger>

        {/* Toggle all button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleAll(!allEnabled)}
          className="h-6 px-2 text-[10px] text-zinc-500 hover:text-zinc-300"
        >
          {allEnabled ? 'Disable All' : 'Enable All'}
        </Button>
      </div>

      <CollapsibleContent>
        <AnimatePresence mode="popLayout">
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="grid grid-cols-2 gap-1.5 pl-6"
          >
            {items.map((item) => {
              const isActive = activeItems.includes(item)
              return (
                <motion.label
                  key={item}
                  layout
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all',
                    'border border-transparent',
                    isActive
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-zinc-900/50 hover:bg-zinc-800/50'
                  )}
                >
                  <Checkbox
                    checked={isActive}
                    onCheckedChange={(checked) => onToggle(item, !!checked)}
                    className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                  <span
                    className={cn(
                      'text-xs font-mono truncate',
                      isActive ? 'text-emerald-300' : 'text-zinc-400'
                    )}
                    title={item}
                  >
                    {item}
                  </span>
                </motion.label>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </CollapsibleContent>
    </Collapsible>
  )
}

interface CapabilityFlagProps {
  label: string
  description: string
  icon: React.ReactNode
  checked: boolean
  onChange: (checked: boolean) => void
}

function CapabilityFlag({ label, description, icon, checked, onChange }: CapabilityFlagProps) {
  return (
    <label
      className={cn(
        'flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-all',
        'border',
        checked
          ? 'bg-emerald-500/10 border-emerald-500/30'
          : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
      )}
    >
      <div
        className={cn(
          'p-1.5 rounded-md',
          checked ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn('text-xs font-medium', checked ? 'text-zinc-200' : 'text-zinc-400')}>
          {label}
        </div>
        <div className="text-[10px] text-zinc-600 truncate">{description}</div>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onChange}
        className="data-[state=checked]:bg-emerald-600"
      />
    </label>
  )
}

/**
 * CapabilityTogglePanel - Shows agent capabilities as toggles for task execution
 * Displays when a task has an assigned agent profile
 */
export function CapabilityTogglePanel({ task, className }: CapabilityTogglePanelProps) {
  const { updateTaskActiveCapabilities } = useBoardStore()
  const { getAgent, profiles } = useAgentProfileStore()

  // Get agent profile from task's agent or find by type
  const agentProfile = useMemo(() => {
    // First try to get by agent ID if stored
    if (task.agent?.sessionId) {
      const profile = getAgent(task.agent.sessionId)
      if (profile) return profile
    }
    // Otherwise find first enabled profile matching agent type
    if (task.agent?.type) {
      return profiles.find((p) => p.baseType === task.agent?.type && p.isEnabled !== false)
    }
    return undefined
  }, [task.agent, getAgent, profiles])

  // Get capabilities from agent profile
  const agentCapabilities = agentProfile?.capabilities || {}

  // Get active capabilities from task (defaults to all from agent if not configured)
  const activeCapabilities = useMemo(() => {
    if (task.activeCapabilities?.isConfigured) {
      return task.activeCapabilities
    }
    // Default: all agent capabilities are active
    return {
      skills: agentCapabilities.skills || [],
      mcpServers: agentCapabilities.mcpServers || [],
      subagents: agentCapabilities.subagents || [],
      slashCommands: agentCapabilities.slashCommands || [],
      canCreateWorktree: agentCapabilities.canCreateWorktree ?? false,
      canCreatePR: agentCapabilities.canCreatePR ?? false,
      canRunBash: agentCapabilities.canRunBash ?? true,
    }
  }, [task.activeCapabilities, agentCapabilities])

  // Toggle handlers for list items
  const handleToggleSkill = useCallback(
    (skill: string, enabled: boolean) => {
      const current = activeCapabilities.skills || []
      const updated = enabled
        ? [...current, skill]
        : current.filter((s) => s !== skill)
      updateTaskActiveCapabilities(task.id, { skills: updated })
    },
    [activeCapabilities.skills, task.id, updateTaskActiveCapabilities]
  )

  const handleToggleMCP = useCallback(
    (server: string, enabled: boolean) => {
      const current = activeCapabilities.mcpServers || []
      const updated = enabled
        ? [...current, server]
        : current.filter((s) => s !== server)
      updateTaskActiveCapabilities(task.id, { mcpServers: updated })
    },
    [activeCapabilities.mcpServers, task.id, updateTaskActiveCapabilities]
  )

  const handleToggleSubagent = useCallback(
    (subagent: string, enabled: boolean) => {
      const current = activeCapabilities.subagents || []
      const updated = enabled
        ? [...current, subagent]
        : current.filter((s) => s !== subagent)
      updateTaskActiveCapabilities(task.id, { subagents: updated })
    },
    [activeCapabilities.subagents, task.id, updateTaskActiveCapabilities]
  )

  const handleToggleSlashCommand = useCallback(
    (cmd: string, enabled: boolean) => {
      const current = activeCapabilities.slashCommands || []
      const updated = enabled
        ? [...current, cmd]
        : current.filter((s) => s !== cmd)
      updateTaskActiveCapabilities(task.id, { slashCommands: updated })
    },
    [activeCapabilities.slashCommands, task.id, updateTaskActiveCapabilities]
  )

  // Toggle all handlers
  const handleToggleAllSkills = useCallback(
    (enabled: boolean) => {
      updateTaskActiveCapabilities(task.id, {
        skills: enabled ? [...(agentCapabilities.skills || [])] : [],
      })
    },
    [agentCapabilities.skills, task.id, updateTaskActiveCapabilities]
  )

  const handleToggleAllMCPs = useCallback(
    (enabled: boolean) => {
      updateTaskActiveCapabilities(task.id, {
        mcpServers: enabled ? [...(agentCapabilities.mcpServers || [])] : [],
      })
    },
    [agentCapabilities.mcpServers, task.id, updateTaskActiveCapabilities]
  )

  const handleToggleAllSubagents = useCallback(
    (enabled: boolean) => {
      updateTaskActiveCapabilities(task.id, {
        subagents: enabled ? [...(agentCapabilities.subagents || [])] : [],
      })
    },
    [agentCapabilities.subagents, task.id, updateTaskActiveCapabilities]
  )

  const handleToggleAllSlashCommands = useCallback(
    (enabled: boolean) => {
      updateTaskActiveCapabilities(task.id, {
        slashCommands: enabled ? [...(agentCapabilities.slashCommands || [])] : [],
      })
    },
    [agentCapabilities.slashCommands, task.id, updateTaskActiveCapabilities]
  )

  // Flag toggle handlers
  const handleToggleFlag = useCallback(
    (flag: keyof Pick<TaskActiveCapabilities, 'canCreateWorktree' | 'canCreatePR' | 'canRunBash'>, value: boolean) => {
      updateTaskActiveCapabilities(task.id, { [flag]: value })
    },
    [task.id, updateTaskActiveCapabilities]
  )

  // Check if there are any capabilities to show
  const hasCapabilities =
    (agentCapabilities.skills?.length || 0) > 0 ||
    (agentCapabilities.mcpServers?.length || 0) > 0 ||
    (agentCapabilities.subagents?.length || 0) > 0 ||
    (agentCapabilities.slashCommands?.length || 0) > 0

  // If no agent or no capabilities, show empty state
  if (!task.agent) {
    return null
  }

  // Count active capabilities
  const activeCount =
    (activeCapabilities.skills?.length || 0) +
    (activeCapabilities.mcpServers?.length || 0) +
    (activeCapabilities.subagents?.length || 0) +
    (activeCapabilities.slashCommands?.length || 0) +
    (activeCapabilities.canCreateWorktree ? 1 : 0) +
    (activeCapabilities.canCreatePR ? 1 : 0) +
    (activeCapabilities.canRunBash ? 1 : 0)

  const totalCount =
    (agentCapabilities.skills?.length || 0) +
    (agentCapabilities.mcpServers?.length || 0) +
    (agentCapabilities.subagents?.length || 0) +
    (agentCapabilities.slashCommands?.length || 0) +
    3 // 3 flags

  return (
    <div className={cn('glass-dark rounded-lg p-4 space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-violet-500/20">
            <Sparkles className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-200">Active Capabilities</h3>
            <p className="text-[10px] text-zinc-500">
              {agentProfile?.name || 'Agent'} - Toggle capabilities for this task
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={cn(
            'text-[10px] font-mono',
            activeCount === totalCount
              ? 'text-emerald-400 border-emerald-500/30'
              : 'text-zinc-400 border-zinc-700'
          )}
        >
          {activeCount}/{totalCount} active
        </Badge>
      </div>

      {/* Capability Sections */}
      {hasCapabilities ? (
        <div className="space-y-3">
          <CapabilitySection
            title="Skills"
            icon={<Puzzle className="h-3 w-3" />}
            iconColor="bg-cyan-500/20 text-cyan-400"
            items={agentCapabilities.skills || []}
            activeItems={activeCapabilities.skills || []}
            onToggle={handleToggleSkill}
            onToggleAll={handleToggleAllSkills}
          />

          <CapabilitySection
            title="MCP Servers"
            icon={<Server className="h-3 w-3" />}
            iconColor="bg-purple-500/20 text-purple-400"
            items={agentCapabilities.mcpServers || []}
            activeItems={activeCapabilities.mcpServers || []}
            onToggle={handleToggleMCP}
            onToggleAll={handleToggleAllMCPs}
          />

          <CapabilitySection
            title="Subagents"
            icon={<Users className="h-3 w-3" />}
            iconColor="bg-amber-500/20 text-amber-400"
            items={agentCapabilities.subagents || []}
            activeItems={activeCapabilities.subagents || []}
            onToggle={handleToggleSubagent}
            onToggleAll={handleToggleAllSubagents}
          />

          <CapabilitySection
            title="Slash Commands"
            icon={<Terminal className="h-3 w-3" />}
            iconColor="bg-pink-500/20 text-pink-400"
            items={agentCapabilities.slashCommands || []}
            activeItems={activeCapabilities.slashCommands || []}
            onToggle={handleToggleSlashCommand}
            onToggleAll={handleToggleAllSlashCommands}
          />
        </div>
      ) : (
        <div className="py-4 text-center">
          <p className="text-xs text-zinc-500">
            No skills, MCPs, or subagents configured for this agent.
          </p>
        </div>
      )}

      {/* Capability Flags */}
      <div className="pt-3 border-t border-zinc-800 space-y-2">
        <div className="text-[10px] uppercase tracking-wide text-zinc-500 mb-2">
          Permissions
        </div>
        <CapabilityFlag
          label="Run Bash"
          description="Execute shell commands"
          icon={<Terminal className="h-3.5 w-3.5" />}
          checked={activeCapabilities.canRunBash ?? true}
          onChange={(checked) => handleToggleFlag('canRunBash', checked)}
        />
        <CapabilityFlag
          label="Create Worktree"
          description="Create git worktrees for isolation"
          icon={<GitBranch className="h-3.5 w-3.5" />}
          checked={activeCapabilities.canCreateWorktree ?? false}
          onChange={(checked) => handleToggleFlag('canCreateWorktree', checked)}
        />
        <CapabilityFlag
          label="Create PR"
          description="Create pull requests on GitHub"
          icon={<GitPullRequest className="h-3.5 w-3.5" />}
          checked={activeCapabilities.canCreatePR ?? false}
          onChange={(checked) => handleToggleFlag('canCreatePR', checked)}
        />
      </div>
    </div>
  )
}
