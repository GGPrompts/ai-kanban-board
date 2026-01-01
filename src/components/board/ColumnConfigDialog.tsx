'use client'

import { useState, useEffect } from 'react'
import {
  Sparkles,
  Gem,
  Code2,
  Github,
  Zap,
  MousePointer2,
  Bot,
  Trash2,
  Settings2,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { useBoardStore } from '@/lib/store'
import { Column, AgentType, AGENT_META, COLUMN_COLORS } from '@/types'
import { cn } from '@/lib/utils'

// Explicit mapping for Tailwind to see the classes
const COLOR_BG_MAP: Record<string, string> = {
  'border-t-emerald-500': 'bg-emerald-500',
  'border-t-cyan-500': 'bg-cyan-500',
  'border-t-blue-500': 'bg-blue-500',
  'border-t-purple-500': 'bg-purple-500',
  'border-t-pink-500': 'bg-pink-500',
  'border-t-red-500': 'bg-red-500',
  'border-t-orange-500': 'bg-orange-500',
  'border-t-yellow-500': 'bg-yellow-500',
  'border-t-green-500': 'bg-green-500',
  'border-t-teal-500': 'bg-teal-500',
  'border-t-slate-500': 'bg-slate-500',
  'border-t-zinc-500': 'bg-zinc-500',
}

// Icon mapping for agent types
const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Gem,
  Code2,
  Github,
  Zap,
  MousePointer2,
  Bot,
}

interface ColumnConfigDialogProps {
  column: Column | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ColumnConfigDialog({ column, open, onOpenChange }: ColumnConfigDialogProps) {
  const { getCurrentBoard, updateColumn, deleteColumn } = useBoardStore()
  const board = getCurrentBoard()

  const [title, setTitle] = useState('')
  const [color, setColor] = useState('')
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null)
  const [systemPrompt, setSystemPrompt] = useState('')
  const [autoStart, setAutoStart] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(false)
  const [wipLimit, setWipLimit] = useState<number | undefined>(undefined)

  // Initialize form when column changes
  useEffect(() => {
    if (column) {
      setTitle(column.title)
      setColor(column.color)
      setSelectedAgent(column.assignedAgent || null)
      setSystemPrompt(column.agentConfig?.systemPrompt || '')
      setAutoStart(column.agentConfig?.autoStart || false)
      setAutoAdvance(column.agentConfig?.autoAdvance || false)
      setWipLimit(column.wipLimit)
    }
  }, [column])

  if (!column || !board) return null

  const handleSave = () => {
    updateColumn(board.id, column.id, {
      title,
      color,
      assignedAgent: selectedAgent || undefined,
      agentConfig: selectedAgent ? {
        systemPrompt: systemPrompt || undefined,
        autoStart,
        autoAdvance,
      } : undefined,
      wipLimit,
    })
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (board.columns.length <= 1) {
      alert('Cannot delete the last column')
      return
    }
    if (confirm(`Delete "${column.title}"? Tasks will be moved to the first column.`)) {
      deleteColumn(board.id, column.id)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-overlay border-zinc-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-teal-500" />
            Configure Workflow Step
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Set up agent and prompt for this step
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
          {/* Step Name */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-zinc-400 text-xs uppercase tracking-wide">
              Step Name
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-zinc-900 border-zinc-700 text-zinc-100"
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label className="text-zinc-400 text-xs uppercase tracking-wide">Color</Label>
            <div className="flex flex-wrap gap-2">
              {COLUMN_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "size-7 rounded-md border-2 transition-all",
                    COLOR_BG_MAP[c] || 'bg-zinc-500',
                    color === c
                      ? "border-white scale-110"
                      : "border-transparent hover:scale-105"
                  )}
                />
              ))}
            </div>
          </div>

          {/* WIP Limit */}
          <div className="space-y-2">
            <Label htmlFor="wipLimit" className="text-zinc-400 text-xs uppercase tracking-wide">
              WIP Limit (Optional)
            </Label>
            <Input
              id="wipLimit"
              type="number"
              min={0}
              value={wipLimit ?? ''}
              onChange={(e) => setWipLimit(e.target.value ? parseInt(e.target.value) : undefined)}
              className="bg-zinc-900 border-zinc-700 text-zinc-100 w-24"
              placeholder="None"
            />
            <p className="text-[10px] text-zinc-600">
              Max tasks allowed in this column
            </p>
          </div>

          {/* Agent Selection */}
          <div className="space-y-2 pt-2 border-t border-zinc-800">
            <Label className="text-zinc-400 text-xs uppercase tracking-wide">
              Assigned Agent
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {/* No agent option */}
              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className={cn(
                  "p-2 rounded-lg border transition-all text-center",
                  !selectedAgent
                    ? "border-teal-500 bg-teal-500/10"
                    : "border-zinc-700 hover:border-zinc-600"
                )}
              >
                <Bot className="h-5 w-5 mx-auto mb-1 text-zinc-500" />
                <div className="text-[10px] text-zinc-400">None</div>
              </button>

              {(Object.keys(AGENT_META) as AgentType[]).slice(0, 3).map((type) => {
                const meta = AGENT_META[type]
                const Icon = AGENT_ICONS[meta.icon] || Bot
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedAgent(type)}
                    className={cn(
                      "p-2 rounded-lg border transition-all text-center",
                      selectedAgent === type
                        ? cn(meta.borderColor, meta.bgColor)
                        : "border-zinc-700 hover:border-zinc-600"
                    )}
                  >
                    <Icon className={cn("h-5 w-5 mx-auto mb-1", meta.color)} />
                    <div className="text-[10px] text-zinc-400 truncate">
                      {meta.shortLabel}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Agent Configuration (shown when agent selected) */}
          {selectedAgent && (
            <>
              {/* System Prompt */}
              <div className="space-y-2">
                <Label htmlFor="prompt" className="text-zinc-400 text-xs uppercase tracking-wide">
                  Step Prompt
                </Label>
                <Textarea
                  id="prompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Instructions for the agent at this workflow step..."
                  className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-600 min-h-[100px] text-sm"
                />
                <p className="text-[10px] text-zinc-600">
                  This prompt guides the agent when processing tasks in this column
                </p>
              </div>

              {/* Auto Settings */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <Label className="text-zinc-400 text-xs uppercase tracking-wide">
                  Automation
                </Label>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoStart" className="text-zinc-300 text-sm">
                      Auto-start agent
                    </Label>
                    <p className="text-[10px] text-zinc-600">
                      Start agent when task enters this column
                    </p>
                  </div>
                  <Switch
                    id="autoStart"
                    checked={autoStart}
                    onCheckedChange={setAutoStart}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="autoAdvance" className="text-zinc-300 text-sm">
                      Auto-advance
                    </Label>
                    <p className="text-[10px] text-zinc-600">
                      Move task to next column when done
                    </p>
                  </div>
                  <Switch
                    id="autoAdvance"
                    checked={autoAdvance}
                    onCheckedChange={setAutoAdvance}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <DialogFooter className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Step
          </Button>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="bg-teal-600 hover:bg-teal-500">
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
