"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, Sparkles } from "lucide-react"
import { Task, Message, AgentInfo } from "@/types"
import { useBoardStore } from "@/lib/store"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ChatMessage } from "./ChatMessage"
import { ChatInput } from "./ChatInput"
import { AgentSelector } from "@/components/shared/AgentSelector"
import { AgentBadge } from "@/components/shared/AgentBadge"

interface TaskChatProps {
  task: Task
}

export function TaskChat({ task }: TaskChatProps) {
  const addMessage = useBoardStore((state) => state.addMessage)
  const updateTaskAgent = useBoardStore((state) => state.updateTaskAgent)
  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const [isTyping, setIsTyping] = useState(false)

  const messages = task.messages || []

  // Scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages.length, isTyping])

  const handleSend = async (content: string) => {
    // Add user message
    const userMessage: Omit<Message, "id"> = {
      role: "user",
      content,
      timestamp: new Date(),
    }
    addMessage(task.id, userMessage)

    // Set agent to running if assigned
    if (task.agent) {
      updateTaskAgent(task.id, { ...task.agent, status: "running" })
    }

    // Mock AI response after delay
    setIsTyping(true)
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const agentType = task.agent?.type || "claude-code"
    const assistantMessage: Omit<Message, "id"> = {
      role: "assistant",
      content: generateMockResponse(content, agentType),
      timestamp: new Date(),
      model: agentType,
    }
    addMessage(task.id, assistantMessage)
    setIsTyping(false)

    // Set agent back to idle
    if (task.agent) {
      updateTaskAgent(task.id, { ...task.agent, status: "idle" })
    }
  }

  const handleAgentChange = (agentType: string) => {
    updateTaskAgent(task.id, {
      type: agentType as AgentInfo["type"],
      status: "idle",
    })
  }

  return (
    <div className="flex flex-col h-[400px]">
      {/* Agent Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          {task.agent ? (
            <AgentBadge agent={task.agent} />
          ) : (
            <div className="flex items-center gap-2 text-zinc-500">
              <Bot className="h-4 w-4" />
              <span className="text-sm">No agent assigned</span>
            </div>
          )}
        </div>
        <AgentSelector
          value={task.agent?.type}
          onValueChange={handleAgentChange}
        />
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-sm font-medium text-zinc-300">
              Start a conversation
            </h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-xs">
              Chat with the AI agent about this task. Ask questions, give instructions, or request changes.
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isTyping && (
              <ChatMessage
                message={{
                  id: "typing",
                  role: "assistant",
                  content: "Thinking",
                  timestamp: new Date(),
                }}
                isTyping
              />
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <ChatInput
        onSend={handleSend}
        disabled={isTyping}
        placeholder={
          task.agent
            ? `Message ${task.agent.type}...`
            : "Assign an agent to start chatting..."
        }
      />
    </div>
  )
}

// Generate mock responses based on user input
function generateMockResponse(userMessage: string, agentType: string): string {
  const lower = userMessage.toLowerCase()

  if (lower.includes("help") || lower.includes("what can")) {
    return `I'm ${agentType}, ready to help with this task. I can:

- Analyze requirements and suggest implementation approaches
- Write code and tests
- Review existing code for issues
- Explain complex concepts
- Help debug problems

What would you like me to help with?`
  }

  if (lower.includes("implement") || lower.includes("create") || lower.includes("build")) {
    return `I'll help you implement that. Here's my approach:

1. First, I'll analyze the existing codebase structure
2. Then identify the best location for new code
3. Implement the feature with proper typing
4. Add appropriate tests

Should I proceed with this plan?`
  }

  if (lower.includes("fix") || lower.includes("bug") || lower.includes("error")) {
    return `I'll investigate this issue. To help fix it, I'll need to:

1. Reproduce the problem
2. Trace through the relevant code paths
3. Identify the root cause
4. Propose a fix

Can you share any error messages or steps to reproduce?`
  }

  if (lower.includes("review") || lower.includes("check")) {
    return `I'll review the code for:

- Potential bugs and edge cases
- Performance issues
- Security vulnerabilities
- Code style and best practices
- Test coverage

Give me a moment to analyze...`
  }

  // Default echo-style response
  return `Understood. You mentioned: "${userMessage}"

I'm analyzing this request in the context of the task "${agentType === 'claude-code' ? 'using Claude Code' : `with ${agentType}`}".

What specific aspect would you like me to focus on?`
}
