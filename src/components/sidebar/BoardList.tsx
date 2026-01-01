'use client'

import { motion } from 'framer-motion'
import { Kanban, Plus } from 'lucide-react'
import { useBoardStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BoardListProps {
  onNewBoard: () => void
}

export function BoardList({ onNewBoard }: BoardListProps) {
  const { boards, currentBoardId, setCurrentBoard, tasks } = useBoardStore()

  const getTaskCount = (boardId: string) => {
    const board = boards.find((b) => b.id === boardId)
    if (!board) return 0
    return tasks.filter((t) =>
      board.columns.some((c) => c.id === t.columnId)
    ).length
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-semibold terminal-glow flex items-center gap-2">
          <Kanban className="w-5 h-5" />
          Boards
        </h2>
      </div>

      {/* Board List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {boards.map((board, index) => {
          const isActive = board.id === currentBoardId
          const taskCount = getTaskCount(board.id)

          return (
            <motion.button
              key={board.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setCurrentBoard(board.id)}
              className={cn(
                'w-full text-left p-3 rounded-lg transition-all',
                'hover:bg-white/10',
                isActive
                  ? 'bg-emerald-500/20 border border-emerald-500/40'
                  : 'bg-white/5 border border-transparent'
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    'font-medium truncate',
                    isActive ? 'text-emerald-400' : 'text-white/80'
                  )}
                >
                  {board.name}
                </span>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    isActive
                      ? 'bg-emerald-500/30 text-emerald-300'
                      : 'bg-white/10 text-white/50'
                  )}
                >
                  {taskCount}
                </span>
              </div>
              <p className="text-xs text-white/40 mt-1 truncate">
                {board.columns.length} columns
              </p>
            </motion.button>
          )
        })}
      </div>

      {/* New Board Button */}
      <div className="p-4 border-t border-white/10">
        <Button
          onClick={onNewBoard}
          variant="outline"
          className="w-full bg-white/5 border-white/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-400"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Board
        </Button>
      </div>
    </div>
  )
}
