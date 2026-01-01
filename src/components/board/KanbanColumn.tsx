'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { motion } from 'framer-motion'
import { Column, Task } from '@/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { AddTaskButton } from './AddTaskButton'
import { KanbanCard } from './KanbanCard'

interface KanbanColumnProps {
  column: Column
  tasks: Task[]
}

export function KanbanColumn({ column, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'column',
      column,
    },
  })

  const taskIds = tasks.map((task) => task.id)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="kanban-column shrink-0"
    >
      {/* Column Header */}
      <div className={cn('p-3 border-t-4', column.color)}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white terminal-glow">
            {column.title}
          </h3>
          <span
            className="text-sm text-white/60 bg-white/10 px-2 py-0.5 rounded-full"
            suppressHydrationWarning
          >
            {tasks.length}
            {column.wipLimit && (
              <span className="text-white/40">/{column.wipLimit}</span>
            )}
          </span>
        </div>
      </div>

      {/* Droppable Task Area */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[200px] transition-colors duration-200',
          isOver && 'bg-emerald-500/10'
        )}
      >
        <ScrollArea className="h-full max-h-[calc(100vh-200px)]">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            <div className="p-2 space-y-2">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-white/30 text-sm">
                  Drop tasks here
                </div>
              ) : (
                tasks.map((task) => (
                  <KanbanCard key={task.id} task={task} />
                ))
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </div>

      {/* Add Task Button */}
      <AddTaskButton columnId={column.id} />
    </motion.div>
  )
}
