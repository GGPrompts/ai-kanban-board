'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useBoardStore } from '@/lib/store'
import { KanbanColumn } from './KanbanColumn'
import { AddColumnButton } from './AddColumnButton'
import { Task } from '@/types'
import { cn } from '@/lib/utils'

export function KanbanBoard() {
  const { getCurrentBoard, tasks, moveTask, reorderTasks, getTasksByColumn } = useBoardStore()
  const board = getCurrentBoard()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [hasMounted, setHasMounted] = useState(false)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Wait for hydration to complete before rendering dynamic content
  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Check scroll position for navigation buttons
  const updateScrollButtons = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth - 10
    )
  }, [])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    updateScrollButtons()
    container.addEventListener('scroll', updateScrollButtons)
    window.addEventListener('resize', updateScrollButtons)

    return () => {
      container.removeEventListener('scroll', updateScrollButtons)
      window.removeEventListener('resize', updateScrollButtons)
    }
  }, [updateScrollButtons, hasMounted])

  // Scroll by one column width
  const scroll = (direction: 'left' | 'right') => {
    const container = scrollContainerRef.current
    if (!container) return
    const scrollAmount = 360 // column width + gap
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    })
  }

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

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event
      const task = tasks.find((t) => t.id === active.id)
      if (task) {
        setActiveTask(task)
      }
    },
    [tasks]
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      if (!over) return

      const activeId = active.id as string
      const overId = over.id as string

      const activeTask = tasks.find((t) => t.id === activeId)
      if (!activeTask) return

      // Check if dropping over a column
      const overColumn = board?.columns.find((c) => c.id === overId)
      if (overColumn && activeTask.columnId !== overId) {
        const tasksInColumn = getTasksByColumn(overId)
        moveTask(activeId, overId, tasksInColumn.length)
        return
      }

      // Check if dropping over another task
      const overTask = tasks.find((t) => t.id === overId)
      if (overTask && activeTask.columnId !== overTask.columnId) {
        const tasksInColumn = getTasksByColumn(overTask.columnId)
        const overIndex = tasksInColumn.findIndex((t) => t.id === overId)
        moveTask(activeId, overTask.columnId, overIndex)
      }
    },
    [tasks, board, getTasksByColumn, moveTask]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveTask(null)

      if (!over) return

      const activeId = active.id as string
      const overId = over.id as string

      if (activeId === overId) return

      const activeTask = tasks.find((t) => t.id === activeId)
      const overTask = tasks.find((t) => t.id === overId)

      if (activeTask && overTask && activeTask.columnId === overTask.columnId) {
        // Reorder within the same column
        const columnTasks = getTasksByColumn(activeTask.columnId)
        const oldIndex = columnTasks.findIndex((t) => t.id === activeId)
        const newIndex = columnTasks.findIndex((t) => t.id === overId)

        if (oldIndex !== newIndex) {
          const newTaskIds = [...columnTasks.map((t) => t.id)]
          newTaskIds.splice(oldIndex, 1)
          newTaskIds.splice(newIndex, 0, activeId)
          reorderTasks(activeTask.columnId, newTaskIds)
        }
      }
    },
    [tasks, getTasksByColumn, reorderTasks]
  )

  // Show loading state during hydration to prevent mismatch
  if (!hasMounted) {
    return (
      <div className="flex-1 gradient-bg p-6 flex items-center justify-center">
        <div className="text-white/50 animate-pulse">Loading board...</div>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/50">
        <p>No board selected</p>
      </div>
    )
  }

  const sortedColumns = [...board.columns].sort((a, b) => a.order - b.order)
  const columnIds = sortedColumns.map((c) => c.id)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex-1 relative"
    >
      {/* Scroll Left Button */}
      {canScrollLeft && (
        <button
          onClick={() => scroll('left')}
          className={cn(
            "absolute left-2 top-1/2 -translate-y-1/2 z-20",
            "size-10 rounded-full glass-dark border border-zinc-700",
            "flex items-center justify-center",
            "text-zinc-400 hover:text-zinc-200 hover:border-teal-500/50",
            "transition-all hover:scale-105 shadow-lg"
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {/* Scroll Right Button */}
      {canScrollRight && (
        <button
          onClick={() => scroll('right')}
          className={cn(
            "absolute right-2 top-1/2 -translate-y-1/2 z-20",
            "size-10 rounded-full glass-dark border border-zinc-700",
            "flex items-center justify-center",
            "text-zinc-400 hover:text-zinc-200 hover:border-teal-500/50",
            "transition-all hover:scale-105 shadow-lg"
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}

      {/* Scrollable Board Area */}
      <div
        ref={scrollContainerRef}
        className="h-full overflow-x-auto overflow-y-hidden px-6 py-4 scrollbar-visible"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
            <div className="flex gap-4 h-full pb-4">
              {sortedColumns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  tasks={getTasksByColumn(column.id)}
                />
              ))}

              {/* Add Column Button */}
              <AddColumnButton />
            </div>
          </SortableContext>

          <DragOverlay>
            {activeTask && (
              <div className="kanban-card p-3 rounded-lg opacity-90 rotate-3 scale-105">
                <h4 className="text-sm font-medium text-white">{activeTask.title}</h4>
                {activeTask.description && (
                  <p className="text-xs text-white/60 mt-1 line-clamp-2">
                    {activeTask.description}
                  </p>
                )}
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </motion.div>
  )
}
