import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Board, Column, Task, Message, AgentInfo, COLUMN_PRESETS } from '@/types'
import { BOARD_TEMPLATES, BoardTemplateKey } from './constants'

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 15)

// Default board with 5 columns
const createDefaultBoard = (): Board => ({
  id: generateId(),
  name: 'My Kanban Board',
  description: 'AI-powered task management',
  columns: [
    { id: generateId(), title: 'Backlog', color: 'border-t-slate-500', order: 0 },
    { id: generateId(), title: 'Ready', color: 'border-t-cyan-500', order: 1 },
    { id: generateId(), title: 'In Progress', color: 'border-t-yellow-500', order: 2 },
    { id: generateId(), title: 'AI Working', color: 'border-t-emerald-500', order: 3 },
    { id: generateId(), title: 'Done', color: 'border-t-green-500', order: 4 },
  ],
  settings: {
    theme: 'dark',
    showEstimates: true,
    showAgentStatus: true,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
})

interface BoardState {
  boards: Board[]
  currentBoardId: string | null
  tasks: Task[]
  selectedTaskId: string | null

  // Board actions
  createBoard: (name: string) => string
  createBoardFromTemplate: (name: string, templateKey: BoardTemplateKey) => string
  updateBoard: (id: string, updates: Partial<Board>) => void
  deleteBoard: (id: string) => void
  setCurrentBoard: (id: string) => void

  // Column actions
  addColumn: (boardId: string, title: string, color?: string) => void
  updateColumn: (boardId: string, columnId: string, updates: Partial<Column>) => void
  deleteColumn: (boardId: string, columnId: string) => void
  reorderColumns: (boardId: string, columnIds: string[]) => void

  // Task actions
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => string
  updateTask: (id: string, updates: Partial<Task>) => void
  deleteTask: (id: string) => void
  moveTask: (taskId: string, toColumnId: string, newOrder: number) => void
  reorderTasks: (columnId: string, taskIds: string[]) => void
  setSelectedTask: (id: string | null) => void

  // Chat actions
  addMessage: (taskId: string, message: Omit<Message, 'id'>) => void
  updateTaskAgent: (taskId: string, agent: AgentInfo) => void

  // Helpers
  getTasksByColumn: (columnId: string) => Task[]
  getCurrentBoard: () => Board | undefined
}

export const useBoardStore = create<BoardState>()(
  persist(
    (set, get) => ({
      boards: [createDefaultBoard()],
      currentBoardId: null,
      tasks: [],
      selectedTaskId: null,

      // Board actions
      createBoard: (name) => {
        const newBoard: Board = {
          ...createDefaultBoard(),
          id: generateId(),
          name,
        }
        set((state) => ({
          boards: [...state.boards, newBoard],
          currentBoardId: newBoard.id,
        }))
        return newBoard.id
      },

      createBoardFromTemplate: (name, templateKey) => {
        const template = BOARD_TEMPLATES[templateKey]
        const newBoard: Board = {
          id: generateId(),
          name,
          description: `Created from ${template.name} template`,
          columns: template.columns.map((col, index) => ({
            id: generateId(),
            title: col.title,
            color: col.color,
            order: index,
          })),
          settings: {
            theme: 'dark',
            showEstimates: true,
            showAgentStatus: true,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        set((state) => ({
          boards: [...state.boards, newBoard],
          currentBoardId: newBoard.id,
        }))
        return newBoard.id
      },

      updateBoard: (id, updates) => {
        set((state) => ({
          boards: state.boards.map((b) =>
            b.id === id ? { ...b, ...updates, updatedAt: new Date() } : b
          ),
        }))
      },

      deleteBoard: (id) => {
        set((state) => ({
          boards: state.boards.filter((b) => b.id !== id),
          currentBoardId:
            state.currentBoardId === id
              ? state.boards[0]?.id ?? null
              : state.currentBoardId,
          tasks: state.tasks.filter((t) => {
            const board = state.boards.find((b) => b.id === id)
            return !board?.columns.some((c) => c.id === t.columnId)
          }),
        }))
      },

      setCurrentBoard: (id) => set({ currentBoardId: id }),

      // Column actions
      addColumn: (boardId, title, color = 'border-t-slate-500') => {
        set((state) => ({
          boards: state.boards.map((b) => {
            if (b.id !== boardId) return b
            const newColumn: Column = {
              id: generateId(),
              title,
              color,
              order: b.columns.length,
            }
            return {
              ...b,
              columns: [...b.columns, newColumn],
              updatedAt: new Date(),
            }
          }),
        }))
      },

      updateColumn: (boardId, columnId, updates) => {
        set((state) => ({
          boards: state.boards.map((b) => {
            if (b.id !== boardId) return b
            return {
              ...b,
              columns: b.columns.map((c) =>
                c.id === columnId ? { ...c, ...updates } : c
              ),
              updatedAt: new Date(),
            }
          }),
        }))
      },

      deleteColumn: (boardId, columnId) => {
        set((state) => ({
          boards: state.boards.map((b) => {
            if (b.id !== boardId) return b
            return {
              ...b,
              columns: b.columns
                .filter((c) => c.id !== columnId)
                .map((c, i) => ({ ...c, order: i })),
              updatedAt: new Date(),
            }
          }),
          tasks: state.tasks.filter((t) => t.columnId !== columnId),
        }))
      },

      reorderColumns: (boardId, columnIds) => {
        set((state) => ({
          boards: state.boards.map((b) => {
            if (b.id !== boardId) return b
            return {
              ...b,
              columns: columnIds.map((id, order) => {
                const col = b.columns.find((c) => c.id === id)!
                return { ...col, order }
              }),
              updatedAt: new Date(),
            }
          }),
        }))
      },

      // Task actions
      addTask: (taskData) => {
        const id = generateId()
        const now = new Date()
        const newTask: Task = {
          ...taskData,
          id,
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({ tasks: [...state.tasks, newTask] }))
        return id
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date() } : t
          ),
        }))
      },

      deleteTask: (id) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
          selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
        }))
      },

      moveTask: (taskId, toColumnId, newOrder) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, columnId: toColumnId, order: newOrder, updatedAt: new Date() }
              : t
          ),
        }))
      },

      reorderTasks: (columnId, taskIds) => {
        set((state) => ({
          tasks: state.tasks.map((t) => {
            if (t.columnId !== columnId) return t
            const newOrder = taskIds.indexOf(t.id)
            return newOrder >= 0 ? { ...t, order: newOrder } : t
          }),
        }))
      },

      setSelectedTask: (id) => set({ selectedTaskId: id }),

      // Chat actions
      addMessage: (taskId, messageData) => {
        const newMessage: Message = {
          ...messageData,
          id: generateId(),
        }
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  messages: [...(t.messages || []), newMessage],
                  updatedAt: new Date(),
                }
              : t
          ),
        }))
      },

      updateTaskAgent: (taskId, agent) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, agent, updatedAt: new Date() }
              : t
          ),
        }))
      },

      // Helpers
      getTasksByColumn: (columnId) => {
        return get()
          .tasks.filter((t) => t.columnId === columnId)
          .sort((a, b) => a.order - b.order)
      },

      getCurrentBoard: () => {
        const { boards, currentBoardId } = get()
        if (!currentBoardId && boards.length > 0) {
          set({ currentBoardId: boards[0].id })
          return boards[0]
        }
        return boards.find((b) => b.id === currentBoardId)
      },
    }),
    {
      name: 'ai-kanban-storage',
    }
  )
)
