"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Bot, GitBranch, Trash2, MessageSquare, FileCode, History, FileText, FolderGit2 } from "lucide-react"
import { Task } from "@/types"
import { useBoardStore } from "@/lib/store"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { TaskDetailsForm } from "./TaskDetailsForm"
import { TaskTimeline } from "./TaskTimeline"
import { TaskChat } from "./TaskChat"
import { TaskAISettings } from "./TaskAISettings"
import { TaskGitPanel } from "./TaskGitPanel"
import { TaskDiff } from "./TaskDiff"
import { cn } from "@/lib/utils"

export function TaskModal() {
  const selectedTaskId = useBoardStore((state) => state.selectedTaskId)
  const tasks = useBoardStore((state) => state.tasks)
  const setSelectedTask = useBoardStore((state) => state.setSelectedTask)
  const updateTask = useBoardStore((state) => state.updateTask)
  const deleteTask = useBoardStore((state) => state.deleteTask)

  const task = tasks.find((t) => t.id === selectedTaskId)
  const isOpen = !!task

  const handleClose = () => {
    setSelectedTask(null)
  }

  const handleUpdate = (updates: Partial<Task>) => {
    if (task) {
      updateTask(task.id, updates)
    }
  }

  const handleDelete = () => {
    if (task) {
      deleteTask(task.id)
      handleClose()
    }
  }

  if (!task) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="!bg-zinc-900 border-white/10 sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden"
        showCloseButton={true}
      >
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-white/10 shrink-0">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div className="space-y-1 flex-1">
              <DialogTitle className="text-xl font-semibold text-zinc-100 terminal-glow">
                {task.title}
              </DialogTitle>
              <div className="flex items-center gap-3 text-xs text-zinc-500">
                {task.agent && (
                  <div className="flex items-center gap-1">
                    <Bot className="h-3 w-3" />
                    <span className="capitalize">{task.agent.type}</span>
                  </div>
                )}
                {task.git?.branch && (
                  <div className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    <span className="truncate max-w-32">{task.git.branch}</span>
                  </div>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Tabs */}
        <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-6 mt-4 bg-black/40 border border-white/10 shrink-0">
            <TabsTrigger value="details" className="gap-1.5">
              <FileText className="h-4 w-4" />
              Details
            </TabsTrigger>
            <TabsTrigger value="chat" className="gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Chat
            </TabsTrigger>
            <TabsTrigger value="git" className="gap-1.5">
              <FolderGit2 className="h-4 w-4" />
              Git
            </TabsTrigger>
            <TabsTrigger value="diff" className="gap-1.5">
              <FileCode className="h-4 w-4" />
              Diff
            </TabsTrigger>
            <TabsTrigger value="timeline" className="gap-1.5">
              <History className="h-4 w-4" />
              Timeline
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 p-6">
            {/* Details Tab */}
            <TabsContent value="details" className="mt-0 h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key="details"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <TaskDetailsForm task={task} onUpdate={handleUpdate} />
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            {/* Chat Tab */}
            <TabsContent value="chat" className="mt-0 h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="glass-dark rounded-lg">
                    <TaskChat task={task} />
                  </div>
                  <TaskAISettings task={task} />
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            {/* Git Tab */}
            <TabsContent value="git" className="mt-0 h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key="git"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <TaskGitPanel task={task} />
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            {/* Diff Tab */}
            <TabsContent value="diff" className="mt-0 h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key="diff"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <TaskDiff task={task} />
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            {/* Timeline Tab */}
            <TabsContent value="timeline" className="mt-0 h-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <TaskTimeline task={task} />
                </motion.div>
              </AnimatePresence>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
