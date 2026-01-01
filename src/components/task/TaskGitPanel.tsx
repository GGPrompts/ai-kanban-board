"use client"

import { useState } from "react"
import {
  GitBranch,
  GitPullRequest,
  FolderGit2,
  Copy,
  Check,
  ExternalLink,
  GitCommit,
  Plus,
} from "lucide-react"
import { Task } from "@/types"
import { useBoardStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface TaskGitPanelProps {
  task: Task
}

const PR_STATUS_STYLES: Record<string, { bg: string; text: string; glow?: string }> = {
  draft: { bg: "bg-slate-500/20", text: "text-slate-400" },
  open: { bg: "bg-emerald-500/20", text: "text-emerald-400", glow: "shadow-emerald-500/20" },
  merged: { bg: "bg-purple-500/20", text: "text-purple-400" },
  closed: { bg: "bg-red-500/20", text: "text-red-400" },
}

export function TaskGitPanel({ task }: TaskGitPanelProps) {
  const createWorktree = useBoardStore((state) => state.createWorktree)
  const createPR = useBoardStore((state) => state.createPR)
  const updateTaskGit = useBoardStore((state) => state.updateTaskGit)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const git = task.git

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleCreateWorktree = () => {
    createWorktree(task.id)
  }

  const handleCreatePR = () => {
    createPR(task.id)
  }

  const handleUpdatePRStatus = (status: "draft" | "open" | "merged" | "closed") => {
    updateTaskGit(task.id, { prStatus: status })
  }

  // No git info yet - show setup options
  if (!git?.branch && !git?.worktree) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-center">
        <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mb-4">
          <GitBranch className="h-8 w-8 text-cyan-400" />
        </div>
        <h3 className="text-lg font-medium text-zinc-200 terminal-glow">
          Git Integration
        </h3>
        <p className="text-sm text-zinc-500 mt-1 max-w-sm">
          Create a worktree to start working on this task in an isolated environment.
        </p>
        <Button
          onClick={handleCreateWorktree}
          className="mt-6 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
        >
          <FolderGit2 className="h-4 w-4 mr-2" />
          Create Worktree
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Branch Info */}
      {git?.branch && (
        <div className="glass-dark p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wide">
            <GitBranch className="h-3.5 w-3.5" />
            Branch
          </div>
          <div className="flex items-center justify-between">
            <code className="text-sm text-cyan-400 font-mono bg-black/40 px-2 py-1 rounded">
              {git.branch}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-500 hover:text-cyan-400"
              onClick={() => copyToClipboard(git.branch!, "branch")}
            >
              {copiedField === "branch" ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          {git.baseBranch && (
            <p className="text-xs text-zinc-500">
              Based on <span className="text-zinc-400">{git.baseBranch}</span>
            </p>
          )}
        </div>
      )}

      {/* Worktree Path */}
      {git?.worktree && (
        <div className="glass-dark p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wide">
            <FolderGit2 className="h-3.5 w-3.5" />
            Worktree
          </div>
          <div className="flex items-center justify-between">
            <code className="text-xs text-zinc-400 font-mono bg-black/40 px-2 py-1 rounded truncate max-w-[250px]">
              {git.worktree}
            </code>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-500 hover:text-cyan-400"
              onClick={() => copyToClipboard(git.worktree!, "worktree")}
            >
              {copiedField === "worktree" ? (
                <Check className="h-4 w-4 text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* PR Info */}
      {git?.prNumber ? (
        <div className="glass-dark p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wide">
              <GitPullRequest className="h-3.5 w-3.5" />
              Pull Request
            </div>
            {git.prStatus && (
              <Badge
                className={cn(
                  "text-xs capitalize",
                  PR_STATUS_STYLES[git.prStatus].bg,
                  PR_STATUS_STYLES[git.prStatus].text,
                  PR_STATUS_STYLES[git.prStatus].glow && `shadow-lg ${PR_STATUS_STYLES[git.prStatus].glow}`
                )}
              >
                {git.prStatus}
              </Badge>
            )}
          </div>
          <div className="flex items-center justify-between">
            <a
              href={git.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1.5 transition-colors"
            >
              #{git.prNumber}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <div className="flex gap-1">
              {(["draft", "open", "merged", "closed"] as const).map((status) => (
                <Button
                  key={status}
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-6 px-2 text-[10px] capitalize",
                    git.prStatus === status
                      ? PR_STATUS_STYLES[status].text
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                  onClick={() => handleUpdatePRStatus(status)}
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        git?.branch && (
          <Button
            onClick={handleCreatePR}
            className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Pull Request
          </Button>
        )
      )}

      {/* Recent Commits */}
      {git?.commits && git.commits.length > 0 && (
        <div className="glass-dark p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs text-zinc-500 uppercase tracking-wide">
            <GitCommit className="h-3.5 w-3.5" />
            Recent Commits
          </div>
          <div className="space-y-2">
            {git.commits.slice(-5).reverse().map((commit) => (
              <div
                key={commit.sha}
                className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0"
              >
                <code className="text-xs text-cyan-400 font-mono bg-black/40 px-1.5 py-0.5 rounded shrink-0">
                  {commit.sha}
                </code>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-300 truncate">{commit.message}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {commit.author} &middot;{" "}
                    {new Date(commit.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
