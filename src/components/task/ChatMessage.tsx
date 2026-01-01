"use client"

import { motion } from "framer-motion"
import { Bot, User } from "lucide-react"
import { Message } from "@/types"
import { cn } from "@/lib/utils"

interface ChatMessageProps {
  message: Message
  isTyping?: boolean
}

export function ChatMessage({ message, isTyping = false }: ChatMessageProps) {
  const isAssistant = message.role === "assistant"
  const isSystem = message.role === "system"

  if (isSystem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-center my-2"
      >
        <div className="text-xs text-zinc-500 bg-zinc-800/50 px-3 py-1 rounded-full">
          {message.content}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-3 mb-4",
        isAssistant ? "justify-start" : "justify-end"
      )}
    >
      {isAssistant && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Bot className="h-4 w-4 text-emerald-400" />
        </div>
      )}

      <div
        className={cn(
          "max-w-[80%] rounded-lg px-4 py-3",
          isAssistant
            ? "glass border-emerald-500/20"
            : "glass-dark border-cyan-500/20",
          isTyping && "animate-pulse"
        )}
      >
        <div className="text-sm text-zinc-200 whitespace-pre-wrap">
          {message.content}
          {isTyping && (
            <span className="inline-flex ml-1">
              <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
              <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
            </span>
          )}
        </div>
        {message.model && (
          <div className="text-[10px] text-zinc-500 mt-1">
            {message.model}
          </div>
        )}
      </div>

      {!isAssistant && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
          <User className="h-4 w-4 text-cyan-400" />
        </div>
      )}
    </motion.div>
  )
}
