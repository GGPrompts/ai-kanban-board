"use client"

import { KanbanBoard } from "@/components/board"
import { BoardSidebar } from "@/components/sidebar"
import { TaskModal } from "@/components/task"

export default function Home() {
  return (
    <div className="h-screen gradient-bg flex flex-col">
      {/* Header */}
      <header className="flex-shrink-0 p-4 border-b border-white/10">
        <h1 className="text-2xl font-bold terminal-glow">
          AI Kanban Board
        </h1>
        <p className="text-sm text-zinc-400">
          Orchestrate your AI-assisted development workflow
        </p>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <BoardSidebar />

        {/* Board */}
        <main className="flex-1 overflow-hidden">
          <KanbanBoard />
        </main>
      </div>

      {/* Task Modal */}
      <TaskModal />
    </div>
  )
}
