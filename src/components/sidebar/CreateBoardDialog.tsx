'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Kanban, Columns3, LayoutGrid, Workflow } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useBoardStore } from '@/lib/store'
import { BOARD_TEMPLATES, BoardTemplateKey } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface CreateBoardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TEMPLATE_ICONS: Record<BoardTemplateKey, typeof Kanban> = {
  simple: Columns3,
  standard: Kanban,
  complex: LayoutGrid,
  full: Workflow,
}

export function CreateBoardDialog({ open, onOpenChange }: CreateBoardDialogProps) {
  const [name, setName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplateKey>('standard')
  const { createBoardFromTemplate } = useBoardStore()

  const handleCreate = () => {
    if (!name.trim()) return

    createBoardFromTemplate(name.trim(), selectedTemplate)
    setName('')
    setSelectedTemplate('standard')
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      handleCreate()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-dark border-white/20 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="terminal-glow">Create New Board</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Board Name */}
          <div className="space-y-2">
            <label className="text-sm text-white/70">Board Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="My New Board"
              className="bg-white/5 border-white/20 text-white placeholder:text-white/40 focus:border-emerald-500/50"
            />
          </div>

          {/* Template Selection */}
          <div className="space-y-3">
            <label className="text-sm text-white/70">Template</label>
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(BOARD_TEMPLATES) as BoardTemplateKey[]).map((key) => {
                const template = BOARD_TEMPLATES[key]
                const Icon = TEMPLATE_ICONS[key]
                const isSelected = selectedTemplate === key

                return (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedTemplate(key)}
                    className={cn(
                      'p-4 rounded-lg text-left transition-all',
                      'border',
                      isSelected
                        ? 'bg-emerald-500/20 border-emerald-500/50'
                        : 'bg-white/5 border-white/10 hover:border-white/30'
                    )}
                  >
                    <Icon
                      className={cn(
                        'w-5 h-5 mb-2',
                        isSelected ? 'text-emerald-400' : 'text-white/60'
                      )}
                    />
                    <div
                      className={cn(
                        'font-medium text-sm',
                        isSelected ? 'text-emerald-400' : 'text-white/80'
                      )}
                    >
                      {template.name}
                    </div>
                    <div className="text-xs text-white/40 mt-1">
                      {template.columns.length} columns
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Template Preview */}
          <div className="space-y-2">
            <label className="text-sm text-white/70">Preview</label>
            <div className="flex gap-1 overflow-x-auto pb-2">
              {BOARD_TEMPLATES[selectedTemplate].columns.map((col, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex-shrink-0 px-2 py-1 rounded text-xs',
                    'bg-white/10 border-t-2',
                    col.color
                  )}
                >
                  {col.title}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Create Board
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
