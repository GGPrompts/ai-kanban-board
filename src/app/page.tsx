"use client"

import { KanbanBoard } from "@/components/board"
import { CommandBar } from "@/components/board/CommandBar"
import { BoardSidebar } from "@/components/sidebar"
import { TaskModal } from "@/components/task"
import { Cpu, Radio } from "lucide-react"

export default function Home() {
  return (
    <div className="h-screen gradient-bg hex-pattern flex flex-col crt-overlay">
      {/* Mission Control Header */}
      <header className="flex-shrink-0 px-6 py-4 border-b border-zinc-800/50 relative">
        <div className="flex items-center justify-between">
          {/* Left: Branding */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="size-10 rounded-lg bg-gradient-to-br from-teal-500/20 to-violet-500/20 border border-teal-500/30 flex items-center justify-center">
                <Cpu className="h-5 w-5 text-teal-400" />
              </div>
              <div className="absolute -top-0.5 -right-0.5 size-2.5 bg-emerald-500 rounded-full animate-pulse border-2 border-zinc-900" />
            </div>
            <div>
              <h1 className="text-lg font-bold display tracking-wider gradient-text-theme">
                AGENT ORCHESTRATOR
              </h1>
              <p className="text-[10px] text-zinc-500 mono tracking-wide">
                AI WORKFLOW COMMAND CENTER
              </p>
            </div>
          </div>

          {/* Right: System Status */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs mono">
              <Radio className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
              <span className="text-zinc-500">SYSTEM</span>
              <span className="text-emerald-400">ONLINE</span>
            </div>
            <div className="h-6 w-px bg-zinc-800" />
            <div className="text-[10px] mono text-zinc-600">
              v0.1.0-alpha
            </div>
          </div>
        </div>

        {/* Decorative line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/30 to-transparent" />
      </header>

      {/* Command Bar - Agent Status */}
      <CommandBar />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <BoardSidebar />

        {/* Board */}
        <main className="flex-1 overflow-hidden relative">
          {/* Subtle grid pattern in content area */}
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none">
            <div className="h-full w-full bg-[repeating-linear-gradient(0deg,transparent,transparent_49px,rgba(20,184,166,0.5)_50px),repeating-linear-gradient(90deg,transparent,transparent_49px,rgba(20,184,166,0.5)_50px)]" />
          </div>
          <KanbanBoard />
        </main>
      </div>

      {/* Task Modal */}
      <TaskModal />
    </div>
  )
}
