"use client"

import { useState, useEffect } from "react"
import { Settings, FolderOpen, Shield, Bot, Loader2 } from "lucide-react"
import { Task, TaskClaudeSettings } from "@/types"
import { useBoardStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface ClaudeAgent {
  name: string
  description?: string
  path: string
}

interface TaskAISettingsProps {
  task: Task
}

export function TaskAISettings({ task }: TaskAISettingsProps) {
  const updateTaskClaudeSettings = useBoardStore(
    (state) => state.updateTaskClaudeSettings
  )

  const [agents, setAgents] = useState<ClaudeAgent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  const settings = task.claudeSettings || {}

  // Fetch available agents
  useEffect(() => {
    async function fetchAgents() {
      try {
        const response = await fetch("/api/chat")
        if (response.ok) {
          const data = await response.json()
          setAgents(data.agents || [])
        }
      } catch (error) {
        console.error("Failed to fetch agents:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchAgents()
  }, [])

  const handleChange = (updates: Partial<TaskClaudeSettings>) => {
    updateTaskClaudeSettings(task.id, updates)
  }

  return (
    <div className="space-y-4">
      {/* Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full justify-between text-zinc-400 hover:text-zinc-200"
      >
        <span className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          AI Settings
        </span>
        <span className="text-xs">
          {isExpanded ? "Hide" : "Show"}
        </span>
      </Button>

      {isExpanded && (
        <div className="space-y-4 p-4 glass rounded-lg">
          {/* Agent Selection */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 flex items-center gap-2">
              <Bot className="h-3 w-3" />
              Agent
            </label>
            <Select
              value={settings.agent || "_default"}
              onValueChange={(value) =>
                handleChange({ agent: value === "_default" ? undefined : value })
              }
            >
              <SelectTrigger className="bg-black/40 border-white/10">
                <SelectValue placeholder="Default agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_default">Default</SelectItem>
                {isLoading ? (
                  <SelectItem value="loading" disabled>
                    <Loader2 className="h-3 w-3 animate-spin mr-2" />
                    Loading agents...
                  </SelectItem>
                ) : (
                  agents.map((agent) => (
                    <SelectItem key={agent.name} value={agent.name}>
                      {agent.name}
                      {agent.description && (
                        <span className="text-zinc-500 ml-2">
                          - {agent.description}
                        </span>
                      )}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Working Directory */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 flex items-center gap-2">
              <FolderOpen className="h-3 w-3" />
              Working Directory
            </label>
            <Input
              value={settings.workingDir || ""}
              onChange={(e) =>
                handleChange({ workingDir: e.target.value || undefined })
              }
              placeholder="/path/to/project"
              className="bg-black/40 border-white/10 text-sm"
            />
          </div>

          {/* Permission Mode */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 flex items-center gap-2">
              <Shield className="h-3 w-3" />
              Permission Mode
            </label>
            <Select
              value={settings.permissionMode || "default"}
              onValueChange={(value) =>
                handleChange({
                  permissionMode: value as TaskClaudeSettings["permissionMode"],
                })
              }
            >
              <SelectTrigger className="bg-black/40 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (ask)</SelectItem>
                <SelectItem value="plan">Plan mode</SelectItem>
                <SelectItem value="bypassPermissions">
                  Bypass permissions
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400">
              Additional System Prompt
            </label>
            <Textarea
              value={settings.systemPrompt || ""}
              onChange={(e) =>
                handleChange({ systemPrompt: e.target.value || undefined })
              }
              placeholder="Add custom instructions for this task..."
              className="bg-black/40 border-white/10 text-sm min-h-[80px]"
            />
          </div>

          {/* Allowed Tools */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400">
              Allowed Tools (comma-separated)
            </label>
            <Input
              value={settings.allowedTools?.join(", ") || ""}
              onChange={(e) =>
                handleChange({
                  allowedTools: e.target.value
                    ? e.target.value.split(",").map((t) => t.trim())
                    : undefined,
                })
              }
              placeholder="Read, Glob, Grep, Edit..."
              className="bg-black/40 border-white/10 text-sm"
            />
          </div>

          {/* Disallowed Tools */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400">
              Disallowed Tools (comma-separated)
            </label>
            <Input
              value={settings.disallowedTools?.join(", ") || ""}
              onChange={(e) =>
                handleChange({
                  disallowedTools: e.target.value
                    ? e.target.value.split(",").map((t) => t.trim())
                    : undefined,
                })
              }
              placeholder="Bash, Write..."
              className="bg-black/40 border-white/10 text-sm"
            />
          </div>
        </div>
      )}
    </div>
  )
}
