'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PanelLeftClose, PanelLeft, LayoutGrid } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BoardList } from './BoardList'
import { CreateBoardDialog } from './CreateBoardDialog'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function BoardSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  return (
    <TooltipProvider>
      <AnimatePresence mode="wait">
        {isCollapsed ? (
          <motion.div
            key="collapsed"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 48, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 border-r border-zinc-800 bg-zinc-900/50 flex flex-col items-center py-3 gap-2"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCollapsed(false)}
                  className="hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                >
                  <PanelLeft className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="text-xs">Expand sidebar</p>
              </TooltipContent>
            </Tooltip>

            <div className="h-px w-6 bg-zinc-800 my-1" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                >
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p className="text-xs">Boards</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        ) : (
          <motion.aside
            key="expanded"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 260, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'flex-shrink-0 border-r border-zinc-800 bg-zinc-900/50',
              'flex flex-col h-full overflow-hidden relative'
            )}
          >
            {/* Header with Collapse Button */}
            <div className="flex items-center justify-between px-3 py-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <LayoutGrid className="w-4 h-4 text-teal-500" />
                <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Boards
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsCollapsed(true)}
                    className="h-7 w-7 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="text-xs">Collapse sidebar</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <BoardList onNewBoard={() => setIsCreateDialogOpen(true)} />
          </motion.aside>
        )}
      </AnimatePresence>

      <CreateBoardDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </TooltipProvider>
  )
}
