'use client'

import { useState, useCallback } from 'react'
import {
  Bot,
  Sparkles,
  Code2,
  Gem,
  Github,
  Zap,
  MousePointer2,
  Plus,
  X,
  Settings,
  Terminal,
  Puzzle,
  Server,
  Users,
  Save,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { useAgentProfileStore } from '@/lib/agent-store'
import { AgentType, AGENT_META, AgentCapabilities, AgentCLIConfig } from '@/types'
import { cn } from '@/lib/utils'

interface AgentEditorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentId?: string // If provided, edit mode; otherwise create mode
}

type PermissionMode = 'bypassPermissions' | 'plan' | 'default'

const AGENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Gem,
  Code2,
  Github,
  Zap,
  MousePointer2,
  Bot,
}

const AVATAR_OPTIONS = [
  { value: 'Sparkles', label: 'Sparkles', icon: Sparkles },
  { value: 'Bot', label: 'Robot', icon: Bot },
  { value: 'Code2', label: 'Code', icon: Code2 },
  { value: 'Gem', label: 'Gem', icon: Gem },
  { value: 'Zap', label: 'Lightning', icon: Zap },
  { value: 'Terminal', label: 'Terminal', icon: Terminal },
]

const PERMISSION_MODES: { value: PermissionMode; label: string; description: string }[] = [
  { value: 'default', label: 'Default', description: 'Normal permission prompts' },
  { value: 'plan', label: 'Plan Mode', description: 'Plan before executing' },
  { value: 'bypassPermissions', label: 'Bypass', description: 'Skip permission prompts' },
]

function TagInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder: string
}) {
  const [inputValue, setInputValue] = useState('')

  const handleAdd = useCallback(() => {
    const trimmed = inputValue.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
      setInputValue('')
    }
  }, [inputValue, value, onChange])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  const handleRemove = (item: string) => {
    onChange(value.filter((v) => v !== item))
  }

  return (
    <div className="space-y-2">
      <Label className="text-zinc-400 text-xs uppercase tracking-wide">{label}</Label>
      <div className="flex gap-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="bg-zinc-900 border-zinc-700 text-zinc-100 flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAdd}
          className="border-zinc-700 shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {value.map((item) => (
            <Badge
              key={item}
              variant="secondary"
              className="bg-zinc-800 text-zinc-300 hover:bg-zinc-700 pr-1"
            >
              {item}
              <button
                onClick={() => handleRemove(item)}
                className="ml-1 hover:text-red-400 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

function EnvVarsEditor({
  value,
  onChange,
}: {
  value: Record<string, string>
  onChange: (value: Record<string, string>) => void
}) {
  const [newKey, setNewKey] = useState('')
  const [newValue, setNewValue] = useState('')

  const handleAdd = () => {
    const key = newKey.trim()
    const val = newValue.trim()
    if (key && val) {
      onChange({ ...value, [key]: val })
      setNewKey('')
      setNewValue('')
    }
  }

  const handleRemove = (key: string) => {
    const updated = { ...value }
    delete updated[key]
    onChange(updated)
  }

  return (
    <div className="space-y-2">
      <Label className="text-zinc-400 text-xs uppercase tracking-wide">Environment Variables</Label>
      <div className="flex gap-2">
        <Input
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="KEY"
          className="bg-zinc-900 border-zinc-700 text-zinc-100 font-mono text-sm w-1/3"
        />
        <Input
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          placeholder="value"
          className="bg-zinc-900 border-zinc-700 text-zinc-100 font-mono text-sm flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleAdd}
          className="border-zinc-700 shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {Object.entries(value).length > 0 && (
        <div className="space-y-1 mt-2">
          {Object.entries(value).map(([key, val]) => (
            <div
              key={key}
              className="flex items-center gap-2 px-2 py-1.5 bg-zinc-900 rounded border border-zinc-800"
            >
              <span className="text-xs font-mono text-emerald-400">{key}</span>
              <span className="text-zinc-600">=</span>
              <span className="text-xs font-mono text-zinc-400 flex-1 truncate">{val}</span>
              <button
                onClick={() => handleRemove(key)}
                className="text-zinc-500 hover:text-red-400 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function AgentEditorDialog({ open, onOpenChange, agentId }: AgentEditorDialogProps) {
  const { getAgent, addAgent, updateAgent } = useAgentProfileStore()
  const isEditMode = !!agentId
  const existingAgent = agentId ? getAgent(agentId) : undefined

  // Compute initial values from existing agent (used via key prop reset pattern)
  const initialCaps = existingAgent?.capabilities || {}
  const initialCli = existingAgent?.cliConfig || {}

  // Form state - initialized based on mode using a key to reset when agentId/open changes
  const formKey = `${agentId || 'new'}-${open}`
  const [name, setName] = useState(() => existingAgent?.name || '')
  const [description, setDescription] = useState(() => existingAgent?.description || '')
  const [avatar, setAvatar] = useState(() => existingAgent?.avatar || 'Bot')
  const [baseType, setBaseType] = useState<AgentType>(() => existingAgent?.baseType || 'claude-code')
  const [isEnabled, setIsEnabled] = useState(() => existingAgent?.isEnabled ?? true)

  // Capabilities
  const [skills, setSkills] = useState<string[]>(() => initialCaps.skills || [])
  const [mcpServers, setMcpServers] = useState<string[]>(() => initialCaps.mcpServers || [])
  const [subagents, setSubagents] = useState<string[]>(() => initialCaps.subagents || [])
  const [slashCommands, setSlashCommands] = useState<string[]>(() => initialCaps.slashCommands || [])
  const [canCreateWorktree, setCanCreateWorktree] = useState(() => initialCaps.canCreateWorktree ?? false)
  const [canCreatePR, setCanCreatePR] = useState(() => initialCaps.canCreatePR ?? false)
  const [canRunBash, setCanRunBash] = useState(() => initialCaps.canRunBash ?? true)

  // CLI Config
  const [workingDir, setWorkingDir] = useState(() => initialCli.workingDir || '')
  const [additionalDirs, setAdditionalDirs] = useState<string[]>(() => initialCli.additionalDirs || [])
  const [permissionMode, setPermissionMode] = useState<PermissionMode>(() => initialCli.permissionMode || 'default')
  const [allowedTools, setAllowedTools] = useState<string[]>(() => initialCli.allowedTools || [])
  const [disallowedTools, setDisallowedTools] = useState<string[]>(() => initialCli.disallowedTools || [])
  const [systemPrompt, setSystemPrompt] = useState(() => initialCli.systemPrompt || '')
  const [envVars, setEnvVars] = useState<Record<string, string>>(() => initialCli.envVars || {})
  const [cliFlags, setCliFlags] = useState<string[]>(() => initialCli.cliFlags || [])

  const handleSave = () => {
    if (!name.trim()) return

    const capabilities: AgentCapabilities = {
      skills: skills.length > 0 ? skills : undefined,
      mcpServers: mcpServers.length > 0 ? mcpServers : undefined,
      subagents: subagents.length > 0 ? subagents : undefined,
      slashCommands: slashCommands.length > 0 ? slashCommands : undefined,
      canCreateWorktree: canCreateWorktree || undefined,
      canCreatePR: canCreatePR || undefined,
      canRunBash,
    }

    const cliConfig: AgentCLIConfig = {
      workingDir: workingDir.trim() || undefined,
      additionalDirs: additionalDirs.length > 0 ? additionalDirs : undefined,
      permissionMode: permissionMode !== 'default' ? permissionMode : undefined,
      allowedTools: allowedTools.length > 0 ? allowedTools : undefined,
      disallowedTools: disallowedTools.length > 0 ? disallowedTools : undefined,
      systemPrompt: systemPrompt.trim() || undefined,
      envVars: Object.keys(envVars).length > 0 ? envVars : undefined,
      cliFlags: cliFlags.length > 0 ? cliFlags : undefined,
    }

    const profileData = {
      name: name.trim(),
      description: description.trim() || undefined,
      avatar,
      baseType,
      isEnabled,
      capabilities: Object.values(capabilities).some(Boolean) ? capabilities : undefined,
      cliConfig: Object.values(cliConfig).some(Boolean) ? cliConfig : undefined,
    }

    if (isEditMode && agentId) {
      updateAgent(agentId, profileData)
    } else {
      addAgent(profileData)
    }

    onOpenChange(false)
  }

  const SelectedAvatarIcon = AVATAR_OPTIONS.find((a) => a.value === avatar)?.icon || Bot
  const baseAgentMeta = AGENT_META[baseType]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={formKey} className="glass-overlay border-zinc-800 sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 flex items-center gap-2">
            <div className={cn('p-1.5 rounded-md', baseAgentMeta.bgColor)}>
              <SelectedAvatarIcon className={cn('h-5 w-5', baseAgentMeta.color)} />
            </div>
            {isEditMode ? 'Edit Agent Profile' : 'Create Agent Profile'}
          </DialogTitle>
          <DialogDescription className="text-zinc-500">
            Configure a custom agent with specific capabilities and CLI settings
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="general" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="bg-zinc-900 border border-zinc-800 w-full justify-start shrink-0">
            <TabsTrigger value="general" className="data-[state=active]:bg-zinc-800">
              <Settings className="h-4 w-4 mr-1.5" />
              General
            </TabsTrigger>
            <TabsTrigger value="skills" className="data-[state=active]:bg-zinc-800">
              <Puzzle className="h-4 w-4 mr-1.5" />
              Skills
            </TabsTrigger>
            <TabsTrigger value="mcp" className="data-[state=active]:bg-zinc-800">
              <Server className="h-4 w-4 mr-1.5" />
              MCP
            </TabsTrigger>
            <TabsTrigger value="subagents" className="data-[state=active]:bg-zinc-800">
              <Users className="h-4 w-4 mr-1.5" />
              Subagents
            </TabsTrigger>
            <TabsTrigger value="cli" className="data-[state=active]:bg-zinc-800">
              <Terminal className="h-4 w-4 mr-1.5" />
              CLI
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <div className="pr-4">
              {/* General Tab */}
              <TabsContent value="general" className="space-y-4 mt-0">
                {/* Name */}
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wide">Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Custom Agent"
                    className="bg-zinc-900 border-zinc-700 text-zinc-100"
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wide">Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this agent do?"
                    className="bg-zinc-900 border-zinc-700 text-zinc-100 min-h-[80px] resize-none"
                  />
                </div>

                {/* Avatar Selection */}
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wide">Avatar</Label>
                  <div className="flex gap-2">
                    {AVATAR_OPTIONS.map((option) => {
                      const Icon = option.icon
                      const isSelected = avatar === option.value
                      return (
                        <button
                          key={option.value}
                          onClick={() => setAvatar(option.value)}
                          className={cn(
                            'p-3 rounded-lg border transition-all',
                            isSelected
                              ? 'bg-emerald-500/20 border-emerald-500/50'
                              : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                          )}
                        >
                          <Icon
                            className={cn('h-5 w-5', isSelected ? 'text-emerald-400' : 'text-zinc-500')}
                          />
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Base Agent Type */}
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wide">Base Agent Type</Label>
                  <Select value={baseType} onValueChange={(v) => setBaseType(v as AgentType)}>
                    <SelectTrigger className="bg-zinc-900 border-zinc-700 text-zinc-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800">
                      {(Object.keys(AGENT_META) as AgentType[]).map((type) => {
                        const meta = AGENT_META[type]
                        const Icon = AGENT_ICONS[meta.icon] || Bot
                        return (
                          <SelectItem key={type} value={type} className="focus:bg-zinc-800">
                            <div className="flex items-center gap-2">
                              <Icon className={cn('h-4 w-4', meta.color)} />
                              <span>{meta.label}</span>
                            </div>
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Enabled Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                  <div>
                    <Label className="text-zinc-300 text-sm">Enabled</Label>
                    <p className="text-[10px] text-zinc-600">Enable this agent for assignment</p>
                  </div>
                  <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
                </div>

                {/* Capability Toggles */}
                <div className="space-y-3 pt-2 border-t border-zinc-800">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wide">Capabilities</Label>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-zinc-300 text-sm">Can Run Bash</Label>
                      <p className="text-[10px] text-zinc-600">Execute shell commands</p>
                    </div>
                    <Switch checked={canRunBash} onCheckedChange={setCanRunBash} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-zinc-300 text-sm">Can Create Worktree</Label>
                      <p className="text-[10px] text-zinc-600">Create git worktrees for tasks</p>
                    </div>
                    <Switch checked={canCreateWorktree} onCheckedChange={setCanCreateWorktree} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-zinc-300 text-sm">Can Create PR</Label>
                      <p className="text-[10px] text-zinc-600">Create pull requests on GitHub</p>
                    </div>
                    <Switch checked={canCreatePR} onCheckedChange={setCanCreatePR} />
                  </div>
                </div>
              </TabsContent>

              {/* Skills Tab */}
              <TabsContent value="skills" className="space-y-4 mt-0">
                <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                  <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                    <Puzzle className="h-4 w-4 text-violet-400" />
                    Skills Configuration
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    Skills are reusable capabilities like &apos;commit&apos;, &apos;review-pr&apos;, &apos;feature-dev&apos;.
                    Add skills this agent can invoke.
                  </p>
                </div>

                <TagInput
                  label="Skills"
                  value={skills}
                  onChange={setSkills}
                  placeholder="e.g., commit, review-pr"
                />

                <TagInput
                  label="Slash Commands"
                  value={slashCommands}
                  onChange={setSlashCommands}
                  placeholder="e.g., /deploy, /test"
                />
              </TabsContent>

              {/* MCP Servers Tab */}
              <TabsContent value="mcp" className="space-y-4 mt-0">
                <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                  <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                    <Server className="h-4 w-4 text-cyan-400" />
                    MCP Server Configuration
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    MCP (Model Context Protocol) servers provide tools and resources.
                    Common servers: tabz, shadcn, filesystem, github.
                  </p>
                </div>

                <TagInput
                  label="MCP Servers"
                  value={mcpServers}
                  onChange={setMcpServers}
                  placeholder="e.g., tabz, shadcn"
                />
              </TabsContent>

              {/* Subagents Tab */}
              <TabsContent value="subagents" className="space-y-4 mt-0">
                <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                  <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                    <Users className="h-4 w-4 text-amber-400" />
                    Subagent Configuration
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    Subagents are specialized agents that can be spawned for specific tasks.
                    Examples: Explore, Plan, code-reviewer.
                  </p>
                </div>

                <TagInput
                  label="Subagent Types"
                  value={subagents}
                  onChange={setSubagents}
                  placeholder="e.g., Explore, Plan"
                />
              </TabsContent>

              {/* CLI Config Tab */}
              <TabsContent value="cli" className="space-y-4 mt-0">
                <div className="p-3 rounded-lg bg-zinc-900/50 border border-zinc-800">
                  <div className="flex items-center gap-2 text-sm text-zinc-400 mb-2">
                    <Terminal className="h-4 w-4 text-emerald-400" />
                    CLI Configuration
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    Configure how this agent runs from the command line.
                    These settings apply when spawning agent sessions.
                  </p>
                </div>

                {/* Working Directory */}
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wide">Working Directory</Label>
                  <Input
                    value={workingDir}
                    onChange={(e) => setWorkingDir(e.target.value)}
                    placeholder="~/projects/my-app"
                    className="bg-zinc-900 border-zinc-700 text-zinc-100 font-mono text-sm"
                  />
                </div>

                {/* Additional Directories */}
                <TagInput
                  label="Additional Directories"
                  value={additionalDirs}
                  onChange={setAdditionalDirs}
                  placeholder="~/shared-libs"
                />

                {/* Permission Mode */}
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wide">Permission Mode</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {PERMISSION_MODES.map((mode) => (
                      <button
                        key={mode.value}
                        onClick={() => setPermissionMode(mode.value)}
                        className={cn(
                          'p-2 rounded-lg border text-left transition-all',
                          permissionMode === mode.value
                            ? 'bg-emerald-500/20 border-emerald-500/50'
                            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                        )}
                      >
                        <div
                          className={cn(
                            'text-xs font-medium',
                            permissionMode === mode.value ? 'text-emerald-400' : 'text-zinc-300'
                          )}
                        >
                          {mode.label}
                        </div>
                        <div className="text-[10px] text-zinc-600 mt-0.5">{mode.description}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Allowed/Disallowed Tools */}
                <div className="grid grid-cols-2 gap-4">
                  <TagInput
                    label="Allowed Tools"
                    value={allowedTools}
                    onChange={setAllowedTools}
                    placeholder="Read, Glob"
                  />
                  <TagInput
                    label="Disallowed Tools"
                    value={disallowedTools}
                    onChange={setDisallowedTools}
                    placeholder="Bash, Write"
                  />
                </div>

                {/* System Prompt */}
                <div className="space-y-2">
                  <Label className="text-zinc-400 text-xs uppercase tracking-wide">System Prompt</Label>
                  <Textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    placeholder="Custom instructions prepended to agent sessions..."
                    className="bg-zinc-900 border-zinc-700 text-zinc-100 font-mono text-sm min-h-[100px] resize-none"
                  />
                </div>

                {/* Environment Variables */}
                <EnvVarsEditor value={envVars} onChange={setEnvVars} />

                {/* CLI Flags */}
                <TagInput
                  label="CLI Flags"
                  value={cliFlags}
                  onChange={setCliFlags}
                  placeholder="--verbose, --no-cache"
                />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="border-t border-zinc-800 pt-4 mt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-zinc-300 hover:bg-zinc-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim()}
            className="bg-emerald-600 hover:bg-emerald-500 text-white"
          >
            <Save className="h-4 w-4 mr-2" />
            {isEditMode ? 'Save Changes' : 'Create Agent'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
