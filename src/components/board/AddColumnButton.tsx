"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Plus } from "lucide-react"

import { useBoardStore } from "@/lib/store"
import { COLUMN_COLORS } from "@/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

export function AddColumnButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [columnName, setColumnName] = useState("")
  const [selectedColor, setSelectedColor] = useState<string>(COLUMN_COLORS[0])

  const getCurrentBoard = useBoardStore((state) => state.getCurrentBoard)
  const addColumn = useBoardStore((state) => state.addColumn)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const board = getCurrentBoard()
    if (!board || !columnName.trim()) return

    addColumn(board.id, columnName.trim(), selectedColor)
    setColumnName("")
    setSelectedColor(COLUMN_COLORS[0])
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && columnName.trim()) {
      handleSubmit(e)
    }
  }

  return (
    <>
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="glass-dark min-w-80 w-80 h-32 flex flex-col items-center justify-center gap-2 rounded-lg cursor-pointer group transition-all hover:border-glow"
      >
        <div className="size-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
          <Plus className="size-5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
        </div>
        <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
          Add Column
        </span>
      </motion.button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="glass-dark border-white/10 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-zinc-100">Add New Column</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Column Name</label>
              <Input
                value={columnName}
                onChange={(e) => setColumnName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="e.g., In Review, Testing..."
                className="bg-white/5 border-white/10 text-zinc-100 placeholder:text-zinc-500"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-zinc-400">Color</label>
              <div className="flex flex-wrap gap-2">
                {COLUMN_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setSelectedColor(color)}
                    className={cn(
                      "size-8 rounded-md border-2 transition-all",
                      color.replace("border-t-", "bg-").replace("-500", "-500/80"),
                      selectedColor === color
                        ? "border-white scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                  />
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="text-zinc-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!columnName.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Add Column
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
