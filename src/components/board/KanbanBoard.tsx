'use client'

import { useState, useCallback } from 'react'
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
import { useBoardStore } from '@/lib/store'
import { KanbanColumn } from './KanbanColumn'
import { Task } from '@/types'

export function KanbanBoard() {
  const { getCurrentBoard, tasks, moveTask, reorderTasks, getTasksByColumn } = useBoardStore()
  const board = getCurrentBoard()

  const [activeTask, setActiveTask] = useState<Task | null>(null)

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
      className="flex-1 gradient-bg p-6 overflow-x-auto"
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-4 h-full">
            {sortedColumns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                tasks={getTasksByColumn(column.id)}
              />
            ))}
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
    </motion.div>
  )
}
