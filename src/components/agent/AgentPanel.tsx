'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  GripVertical,
  MoreHorizontal,
  Copy,
  Trash2,
  Download,
  Filter,
  Bot,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AgentCard } from '@/components/shared/AgentCard'
import { useAgentProfileStore } from '@/lib/agent-store'
import { AgentProfile, AgentType, AGENT_META } from '@/types'
import { cn } from '@/lib/utils'

type ViewMode = 'grid' | 'list'
type FilterType = 'all' | AgentType

interface AgentPanelProps {
  onAddAgent?: () => void
  onEditAgent?: (profile: AgentProfile) => void
  className?: string
}

/**
 * SortableAgentCard - Wrapper for AgentCard with drag functionality
 */
function SortableAgentCard({
  profile,
  viewMode,
  onToggleEnabled,
  onClick,
  onDuplicate,
  onDelete,
  onExport,
  isSelected,
}: {
  profile: AgentProfile
  viewMode: ViewMode
  onToggleEnabled?: (enabled: boolean) => void
  onClick?: () => void
  onDuplicate?: () => void
  onDelete?: () => void
  onExport?: () => void
  isSelected?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: profile.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative group',
        isDragging && 'opacity-50 z-50'
      )}
    >
      {/* Drag handle - always visible on hover */}
      <div
        {...attributes}
        {...listeners}
        className={cn(
          'absolute z-10 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing',
          viewMode === 'grid'
            ? 'left-2 top-2 p-1 rounded bg-zinc-800/80'
            : 'left-1 top-1/2 -translate-y-1/2'
        )}
      >
        <GripVertical className="h-4 w-4 text-zinc-400" />
      </div>

      {/* Quick actions menu */}
      <div
        className={cn(
          'absolute z-10 opacity-0 group-hover:opacity-100 transition-opacity',
          viewMode === 'grid' ? 'right-2 top-2' : 'right-2 top-1/2 -translate-y-1/2'
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 bg-zinc-800/80 hover:bg-zinc-700"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-4 w-4 mr-2" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-red-400 focus:text-red-400"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AgentCard
        profile={profile}
        onToggleEnabled={onToggleEnabled}
        onClick={onClick}
        isSelected={isSelected}
      />
    </div>
  )
}

/**
 * AgentPanel - Agent management sidebar/panel
 * Features:
 * - Grid/list view toggle
 * - Search and filter by agent type
 * - Drag-to-reorder with @dnd-kit
 * - Quick actions (duplicate, delete, export)
 * - Add new agent button
 */
export function AgentPanel({
  onAddAgent,
  onEditAgent,
  className,
}: AgentPanelProps) {
  const { profiles, updateAgent, deleteAgent, addAgent } = useAgentProfileStore()

  // Local state
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState<FilterType>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [orderedIds, setOrderedIds] = useState<string[]>(() =>
    profiles.map(p => p.id)
  )

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Filter and search logic
  const filteredProfiles = useMemo(() => {
    let result = profiles

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter((p) => p.baseType === filterType)
    }

    // Search by name or description
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      )
    }

    // Sort by orderedIds if available
    return result.sort((a, b) => {
      const aIdx = orderedIds.indexOf(a.id)
      const bIdx = orderedIds.indexOf(b.id)
      if (aIdx === -1 && bIdx === -1) return 0
      if (aIdx === -1) return 1
      if (bIdx === -1) return -1
      return aIdx - bIdx
    })
  }, [profiles, filterType, searchQuery, orderedIds])

  // Sync orderedIds when profiles change
  useEffect(() => {
    const profileIds = new Set(profiles.map(p => p.id))
    const newOrderedIds = orderedIds.filter(id => profileIds.has(id))
    // Add any new profile IDs
    profiles.forEach(p => {
      if (!newOrderedIds.includes(p.id)) {
        newOrderedIds.push(p.id)
      }
    })
    if (newOrderedIds.length !== orderedIds.length ||
        newOrderedIds.some((id, i) => orderedIds[i] !== id)) {
      setOrderedIds(newOrderedIds)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles])

  // DnD handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)

    if (over && active.id !== over.id) {
      setOrderedIds((items) => {
        const oldIndex = items.indexOf(active.id as string)
        const newIndex = items.indexOf(over.id as string)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }, [])

  // Action handlers
  const handleToggleEnabled = useCallback((id: string, enabled: boolean) => {
    updateAgent(id, { isEnabled: enabled })
  }, [updateAgent])

  const handleDuplicate = useCallback((profile: AgentProfile) => {
    const newId = addAgent({
      name: `${profile.name} (Copy)`,
      avatar: profile.avatar,
      description: profile.description,
      baseType: profile.baseType,
      capabilities: profile.capabilities,
      cliConfig: profile.cliConfig,
      isEnabled: profile.isEnabled,
    })
    // Add to ordered list after the original
    setOrderedIds((ids) => {
      const idx = ids.indexOf(profile.id)
      const newIds = [...ids]
      newIds.splice(idx + 1, 0, newId)
      return newIds
    })
  }, [addAgent])

  const handleDelete = useCallback((id: string) => {
    deleteAgent(id)
    setOrderedIds((ids) => ids.filter((i) => i !== id))
    if (selectedId === id) {
      setSelectedId(null)
    }
  }, [deleteAgent, selectedId])

  const handleExport = useCallback((profile: AgentProfile) => {
    const exportData = {
      name: profile.name,
      avatar: profile.avatar,
      description: profile.description,
      baseType: profile.baseType,
      capabilities: profile.capabilities,
      cliConfig: profile.cliConfig,
    }
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${profile.name.toLowerCase().replace(/\s+/g, '-')}-agent.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [])

  const handleCardClick = useCallback((profile: AgentProfile) => {
    setSelectedId(profile.id)
    onEditAgent?.(profile)
  }, [onEditAgent])

  // Get active profile for drag overlay
  const activeProfile = activeId
    ? profiles.find((p) => p.id === activeId)
    : null

  // Check if there are any profiles
  const hasProfiles = profiles.length > 0

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold terminal-glow flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Agents
          </h2>
          <Button
            onClick={onAddAgent}
            size="sm"
            className="gap-1 bg-emerald-600 hover:bg-emerald-500"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-zinc-900/50 border-zinc-800 focus:border-emerald-500/50"
          />
        </div>

        {/* Filter and View Toggle */}
        <div className="flex items-center gap-2">
          {/* Type Filter */}
          <Select
            value={filterType}
            onValueChange={(v) => setFilterType(v as FilterType)}
          >
            <SelectTrigger className="flex-1 bg-zinc-900/50 border-zinc-800">
              <Filter className="h-4 w-4 mr-2 text-zinc-500" />
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(AGENT_META).map(([type, meta]) => (
                <SelectItem key={type} value={type}>
                  <span className={meta.color}>{meta.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* View Toggle */}
          <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-900/50">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('grid')}
              className={cn(
                'h-8 w-8 rounded-r-none',
                viewMode === 'grid' && 'bg-zinc-800 text-emerald-400'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('list')}
              className={cn(
                'h-8 w-8 rounded-l-none',
                viewMode === 'list' && 'bg-zinc-800 text-emerald-400'
              )}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Agent List/Grid */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {!hasProfiles ? (
            // Empty state
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8 text-zinc-600" />
              </div>
              <h3 className="text-sm font-medium text-zinc-400 mb-1">
                No agents yet
              </h3>
              <p className="text-xs text-zinc-600 mb-4 max-w-[200px]">
                Create your first agent profile to get started
              </p>
              <Button
                onClick={onAddAgent}
                variant="outline"
                size="sm"
                className="gap-1 border-zinc-700 hover:border-emerald-500/50"
              >
                <Plus className="w-4 h-4" />
                Add Agent
              </Button>
            </motion.div>
          ) : filteredProfiles.length === 0 ? (
            // No results state
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-12 text-center"
            >
              <Search className="w-8 h-8 text-zinc-600 mb-4" />
              <h3 className="text-sm font-medium text-zinc-400 mb-1">
                No agents found
              </h3>
              <p className="text-xs text-zinc-600">
                Try adjusting your search or filters
              </p>
            </motion.div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredProfiles.map((p) => p.id)}
                strategy={
                  viewMode === 'grid'
                    ? rectSortingStrategy
                    : verticalListSortingStrategy
                }
              >
                <div
                  className={cn(
                    viewMode === 'grid'
                      ? 'grid grid-cols-1 md:grid-cols-2 gap-3'
                      : 'flex flex-col gap-2'
                  )}
                >
                  <AnimatePresence mode="popLayout">
                    {filteredProfiles.map((profile) => (
                      <motion.div
                        key={profile.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                      >
                        <SortableAgentCard
                          profile={profile}
                          viewMode={viewMode}
                          onToggleEnabled={(enabled) =>
                            handleToggleEnabled(profile.id, enabled)
                          }
                          onClick={() => handleCardClick(profile)}
                          onDuplicate={() => handleDuplicate(profile)}
                          onDelete={() => handleDelete(profile.id)}
                          onExport={() => handleExport(profile)}
                          isSelected={selectedId === profile.id}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </SortableContext>

              {/* Drag Overlay */}
              <DragOverlay adjustScale={false}>
                {activeProfile && (
                  <div className="opacity-90 rotate-3 scale-105">
                    <AgentCard profile={activeProfile} />
                  </div>
                )}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </ScrollArea>

      {/* Footer Stats */}
      {hasProfiles && (
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/30">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span>
              {filteredProfiles.length} of {profiles.length} agent
              {profiles.length !== 1 ? 's' : ''}
            </span>
            <span>
              {profiles.filter((p) => p.isEnabled !== false).length} enabled
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
