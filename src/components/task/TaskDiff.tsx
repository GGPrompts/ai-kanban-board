"use client"

import { useState } from "react"
import {
  FileCode,
  ChevronDown,
  ChevronRight,
  Columns2,
  AlignJustify,
  Plus,
  Minus,
  File,
} from "lucide-react"
import { Task } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"

interface TaskDiffProps {
  task: Task
}

interface DiffLine {
  type: "context" | "addition" | "deletion" | "header"
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

interface MockDiffFile {
  path: string
  additions: number
  deletions: number
  lines: DiffLine[]
}

// Mock diff data for demonstration
const MOCK_DIFF_FILES: MockDiffFile[] = [
  {
    path: "src/components/TaskCard.tsx",
    additions: 12,
    deletions: 3,
    lines: [
      { type: "header", content: "@@ -15,7 +15,16 @@ export function TaskCard({ task }: TaskCardProps) {" },
      { type: "context", content: "  const [isHovered, setIsHovered] = useState(false)", oldLineNumber: 15, newLineNumber: 15 },
      { type: "context", content: "  const updateTask = useBoardStore((s) => s.updateTask)", oldLineNumber: 16, newLineNumber: 16 },
      { type: "context", content: "", oldLineNumber: 17, newLineNumber: 17 },
      { type: "deletion", content: "  // Old implementation", oldLineNumber: 18 },
      { type: "deletion", content: "  const handleClick = () => {}", oldLineNumber: 19 },
      { type: "deletion", content: "", oldLineNumber: 20 },
      { type: "addition", content: "  // Enhanced click handler with AI integration", newLineNumber: 18 },
      { type: "addition", content: "  const handleClick = useCallback(() => {", newLineNumber: 19 },
      { type: "addition", content: "    if (task.agent?.status === 'running') {", newLineNumber: 20 },
      { type: "addition", content: "      console.log('Agent is working...')", newLineNumber: 21 },
      { type: "addition", content: "      return", newLineNumber: 22 },
      { type: "addition", content: "    }", newLineNumber: 23 },
      { type: "addition", content: "    setSelectedTask(task.id)", newLineNumber: 24 },
      { type: "addition", content: "  }, [task.agent?.status, task.id])", newLineNumber: 25 },
      { type: "addition", content: "", newLineNumber: 26 },
      { type: "addition", content: "  // New hover state management", newLineNumber: 27 },
      { type: "addition", content: "  const handleHover = () => setIsHovered(true)", newLineNumber: 28 },
      { type: "addition", content: "", newLineNumber: 29 },
      { type: "context", content: "  return (", oldLineNumber: 21, newLineNumber: 30 },
    ],
  },
  {
    path: "src/lib/store.ts",
    additions: 5,
    deletions: 1,
    lines: [
      { type: "header", content: "@@ -42,4 +42,8 @@ export const useBoardStore = create<BoardState>()(" },
      { type: "context", content: "    updateTask: (id, updates) => {", oldLineNumber: 42, newLineNumber: 42 },
      { type: "context", content: "      set((state) => ({", oldLineNumber: 43, newLineNumber: 43 },
      { type: "deletion", content: "        tasks: state.tasks.map((t) => t.id === id ? { ...t, ...updates } : t)", oldLineNumber: 44 },
      { type: "addition", content: "        tasks: state.tasks.map((t) =>", newLineNumber: 44 },
      { type: "addition", content: "          t.id === id", newLineNumber: 45 },
      { type: "addition", content: "            ? { ...t, ...updates, updatedAt: new Date() }", newLineNumber: 46 },
      { type: "addition", content: "            : t", newLineNumber: 47 },
      { type: "addition", content: "        )", newLineNumber: 48 },
      { type: "context", content: "      }))", oldLineNumber: 45, newLineNumber: 49 },
      { type: "context", content: "    },", oldLineNumber: 46, newLineNumber: 50 },
    ],
  },
]

export function TaskDiff({ task }: TaskDiffProps) {
  const [viewMode, setViewMode] = useState<"unified" | "split">("unified")
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set(MOCK_DIFF_FILES.map((f) => f.path)))

  // Check if task has git info - if not, show placeholder
  if (!task.git?.branch) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-center">
        <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mb-4">
          <FileCode className="h-8 w-8 text-cyan-400" />
        </div>
        <h3 className="text-lg font-medium text-zinc-200 terminal-glow">
          Code Review
        </h3>
        <p className="text-sm text-zinc-500 mt-1 max-w-sm">
          Create a branch and make changes to see the diff here.
        </p>
      </div>
    )
  }

  const toggleFile = (path: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }

  const totalAdditions = MOCK_DIFF_FILES.reduce((sum, f) => sum + f.additions, 0)
  const totalDeletions = MOCK_DIFF_FILES.reduce((sum, f) => sum + f.deletions, 0)

  return (
    <div className="space-y-4">
      {/* Header with stats and view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-400">
            {MOCK_DIFF_FILES.length} files changed
          </span>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1 text-emerald-400">
              <Plus className="h-3 w-3" />
              {totalAdditions}
            </span>
            <span className="flex items-center gap-1 text-red-400">
              <Minus className="h-3 w-3" />
              {totalDeletions}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-black/40 rounded-lg p-0.5 border border-white/10">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 gap-1.5",
              viewMode === "unified"
                ? "bg-white/10 text-zinc-200"
                : "text-zinc-500 hover:text-zinc-300"
            )}
            onClick={() => setViewMode("unified")}
          >
            <AlignJustify className="h-3.5 w-3.5" />
            <span className="text-xs">Unified</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-7 px-2 gap-1.5",
              viewMode === "split"
                ? "bg-white/10 text-zinc-200"
                : "text-zinc-500 hover:text-zinc-300"
            )}
            onClick={() => setViewMode("split")}
          >
            <Columns2 className="h-3.5 w-3.5" />
            <span className="text-xs">Split</span>
          </Button>
        </div>
      </div>

      {/* File Tree */}
      <ScrollArea className="h-[350px]">
        <div className="space-y-3">
          {MOCK_DIFF_FILES.map((file) => (
            <div key={file.path} className="glass-dark overflow-hidden">
              {/* File Header */}
              <button
                onClick={() => toggleFile(file.path)}
                className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
              >
                {expandedFiles.has(file.path) ? (
                  <ChevronDown className="h-4 w-4 text-zinc-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-zinc-500" />
                )}
                <File className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-300 font-mono flex-1 text-left truncate">
                  {file.path}
                </span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-400">+{file.additions}</span>
                  <span className="text-red-400">-{file.deletions}</span>
                </div>
              </button>

              {/* Diff Content */}
              {expandedFiles.has(file.path) && (
                <div className="border-t border-white/5 bg-black/60 font-mono text-xs">
                  {viewMode === "unified" ? (
                    <UnifiedDiff lines={file.lines} />
                  ) : (
                    <SplitDiff lines={file.lines} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}

function UnifiedDiff({ lines }: { lines: DiffLine[] }) {
  return (
    <div className="overflow-x-auto">
      {lines.map((line, i) => (
        <div
          key={i}
          className={cn(
            "flex min-w-max",
            line.type === "addition" && "bg-emerald-500/10",
            line.type === "deletion" && "bg-red-500/10",
            line.type === "header" && "bg-cyan-500/10"
          )}
        >
          {/* Line numbers */}
          <div className="flex shrink-0 text-zinc-600 select-none">
            <span className="w-10 px-2 text-right border-r border-white/5">
              {line.oldLineNumber ?? ""}
            </span>
            <span className="w-10 px-2 text-right border-r border-white/5">
              {line.newLineNumber ?? ""}
            </span>
          </div>
          {/* Sign */}
          <span
            className={cn(
              "w-6 text-center shrink-0",
              line.type === "addition" && "text-emerald-400",
              line.type === "deletion" && "text-red-400"
            )}
          >
            {line.type === "addition" && "+"}
            {line.type === "deletion" && "-"}
            {line.type === "header" && "@@"}
          </span>
          {/* Content */}
          <span
            className={cn(
              "flex-1 px-2 whitespace-pre",
              line.type === "addition" && "text-emerald-300",
              line.type === "deletion" && "text-red-300",
              line.type === "header" && "text-cyan-400",
              line.type === "context" && "text-zinc-400"
            )}
          >
            {line.content}
          </span>
        </div>
      ))}
    </div>
  )
}

function SplitDiff({ lines }: { lines: DiffLine[] }) {
  // Separate lines into old and new sides
  const leftLines: (DiffLine | null)[] = []
  const rightLines: (DiffLine | null)[] = []

  for (const line of lines) {
    if (line.type === "header") {
      leftLines.push(line)
      rightLines.push(line)
    } else if (line.type === "context") {
      leftLines.push(line)
      rightLines.push(line)
    } else if (line.type === "deletion") {
      leftLines.push(line)
      rightLines.push(null)
    } else if (line.type === "addition") {
      // Find matching deletion to pair with
      const lastLeft = leftLines[leftLines.length - 1]
      if (lastLeft === null) {
        leftLines[leftLines.length - 1] = null
        rightLines.push(line)
      } else {
        leftLines.push(null)
        rightLines.push(line)
      }
    }
  }

  // Balance arrays
  while (leftLines.length < rightLines.length) leftLines.push(null)
  while (rightLines.length < leftLines.length) rightLines.push(null)

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max">
        {/* Left side (old) */}
        <div className="flex-1 border-r border-white/10">
          {leftLines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                line?.type === "deletion" && "bg-red-500/10",
                line?.type === "header" && "bg-cyan-500/10"
              )}
            >
              <span className="w-10 px-2 text-right text-zinc-600 border-r border-white/5 shrink-0">
                {line?.oldLineNumber ?? ""}
              </span>
              <span
                className={cn(
                  "flex-1 px-2 whitespace-pre",
                  line?.type === "deletion" && "text-red-300",
                  line?.type === "header" && "text-cyan-400",
                  line?.type === "context" && "text-zinc-400",
                  !line && "bg-zinc-900/50"
                )}
              >
                {line?.content ?? ""}
              </span>
            </div>
          ))}
        </div>
        {/* Right side (new) */}
        <div className="flex-1">
          {rightLines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                line?.type === "addition" && "bg-emerald-500/10",
                line?.type === "header" && "bg-cyan-500/10"
              )}
            >
              <span className="w-10 px-2 text-right text-zinc-600 border-r border-white/5 shrink-0">
                {line?.newLineNumber ?? ""}
              </span>
              <span
                className={cn(
                  "flex-1 px-2 whitespace-pre",
                  line?.type === "addition" && "text-emerald-300",
                  line?.type === "header" && "text-cyan-400",
                  line?.type === "context" && "text-zinc-400",
                  !line && "bg-zinc-900/50"
                )}
              >
                {line?.content ?? ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
