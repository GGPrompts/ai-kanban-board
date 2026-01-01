'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PanelLeftClose, PanelLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BoardList } from './BoardList'
import { CreateBoardDialog } from './CreateBoardDialog'
import { cn } from '@/lib/utils'

export function BoardSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)

  return (
    <>
      <AnimatePresence mode="wait">
        {isCollapsed ? (
          <motion.div
            key="collapsed"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 'auto', opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-shrink-0 border-r border-white/10"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(false)}
              className="m-2 hover:bg-white/10"
              title="Expand sidebar"
            >
              <PanelLeft className="w-5 h-5 text-white/70" />
            </Button>
          </motion.div>
        ) : (
          <motion.aside
            key="expanded"
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className={cn(
              'flex-shrink-0 glass-dark border-r border-white/10',
              'flex flex-col h-full overflow-hidden'
            )}
          >
            {/* Collapse Button */}
            <div className="absolute top-2 right-2 z-10">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setIsCollapsed(true)}
                className="hover:bg-white/10"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="w-4 h-4 text-white/70" />
              </Button>
            </div>

            <BoardList onNewBoard={() => setIsCreateDialogOpen(true)} />
          </motion.aside>
        )}
      </AnimatePresence>

      <CreateBoardDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
    </>
  )
}
