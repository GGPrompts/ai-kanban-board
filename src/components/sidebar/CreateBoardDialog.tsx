'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Columns3,
  Kanban,
  Sparkles,
  Bug,
  Workflow,
  FileText,
  Bot,
  ChevronRight,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useBoardStore } from '@/lib/store'
import { BOARD_TEMPLATES, BoardTemplateKey } from '@/lib/constants'
import { AGENT_META } from '@/types'
import { cn } from '@/lib/utils'

interface CreateBoardDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TEMPLATE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Columns3,
  Kanban,
  Sparkles,
  Bug,
  Workflow,
  FileText,
}

export function CreateBoardDialog({ open, onOpenChange }: CreateBoardDialogProps) {
  const [name, setName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<BoardTemplateKey>('feature')
  const { createBoardFromTemplate } = useBoardStore()

  const handleCreate = () => {
    if (!name.trim()) return

    createBoardFromTemplate(name.trim(), selectedTemplate)
    setName('')
    setSelectedTemplate('feature')
    onOpenChange(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && name.trim()) {
      handleCreate()
    }
  }

  const selectedTemplateData = BOARD_TEMPLATES[selectedTemplate]
  const agentColumns = selectedTemplateData.columns.filter(c => c.agent)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-overlay border-zinc-800 text-white sm:max-w-xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <Workflow className="h-5 w-5 text-teal-500" />
            Create Workflow Board
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Choose a template with pre-configured AI agents and prompts
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4 flex-1 overflow-y-auto">
          {/* Board Name */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 uppercase tracking-wide">Board Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="My Feature Project"
              className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600"
            />
          </div>

          {/* Template Selection */}
          <div className="space-y-3">
            <label className="text-xs text-zinc-400 uppercase tracking-wide">Workflow Template</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(BOARD_TEMPLATES) as BoardTemplateKey[]).map((key) => {
                const template = BOARD_TEMPLATES[key]
                const Icon = TEMPLATE_ICONS[template.icon] || Kanban
                const isSelected = selectedTemplate === key
                const hasAgents = template.columns.some(c => c.agent)

                return (
                  <motion.button
                    key={key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedTemplate(key)}
                    className={cn(
                      'p-3 rounded-lg text-left transition-all',
                      'border relative',
                      isSelected
                        ? 'bg-teal-500/20 border-teal-500/50'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Icon
                        className={cn(
                          'w-5 h-5 shrink-0',
                          isSelected ? 'text-teal-400' : 'text-zinc-500'
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            'font-medium text-sm',
                            isSelected ? 'text-teal-400' : 'text-zinc-200'
                          )}
                        >
                          {template.name}
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1">
                          {template.description}
                        </div>
                      </div>
                    </div>

                    {/* Agent indicator */}
                    {hasAgents && (
                      <div className="absolute top-2 right-2">
                        <Bot className="h-3 w-3 text-violet-400" />
                      </div>
                    )}

                    {/* Column count */}
                    <div className="mt-2 text-[10px] text-zinc-600">
                      {template.columns.length} steps
                      {hasAgents && (
                        <span className="text-violet-400 ml-1">
                          • {template.columns.filter(c => c.agent).length} AI
                        </span>
                      )}
                    </div>
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Template Preview */}
          <div className="space-y-2 border-t border-zinc-800 pt-4">
            <label className="text-xs text-zinc-400 uppercase tracking-wide">
              Pipeline Preview
            </label>

            {/* Column flow */}
            <div className="flex items-center gap-1 overflow-x-auto pb-2">
              {selectedTemplateData.columns.map((col, i) => (
                <div key={i} className="flex items-center shrink-0">
                  <div
                    className={cn(
                      'px-2 py-1.5 rounded text-xs whitespace-nowrap',
                      'bg-zinc-900 border-t-2',
                      col.color,
                      col.agent && 'ring-1 ring-violet-500/30'
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {col.agent && (
                        <Bot className="h-3 w-3 text-violet-400" />
                      )}
                      <span className="text-zinc-300">{col.title}</span>
                    </div>
                  </div>
                  {i < selectedTemplateData.columns.length - 1 && (
                    <ChevronRight className="h-3 w-3 text-zinc-700 mx-0.5 shrink-0" />
                  )}
                </div>
              ))}
            </div>

            {/* AI Steps detail */}
            {agentColumns.length > 0 && (
              <div className="mt-3 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                <div className="text-[10px] text-zinc-500 uppercase mb-2 flex items-center gap-1">
                  <Bot className="h-3 w-3 text-violet-400" />
                  AI-Assisted Steps
                </div>
                <div className="space-y-2">
                  {agentColumns.slice(0, 3).map((col, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div
                        className={cn(
                          'w-1.5 h-1.5 rounded-full mt-1.5 shrink-0',
                          col.color.replace('border-t-', 'bg-')
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-zinc-300">{col.title}</div>
                        {col.agentConfig?.systemPrompt && (
                          <p className="text-[10px] text-zinc-600 line-clamp-1 mt-0.5">
                            {col.agentConfig.systemPrompt}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {agentColumns.length > 3 && (
                    <div className="text-[10px] text-zinc-600">
                      +{agentColumns.length - 3} more AI steps
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-zinc-800 pt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="bg-teal-600 hover:bg-teal-500 text-white"
          >
            Create Board
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
