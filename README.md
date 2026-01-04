# Agent Orchestrator

AI Agent Orchestration Command Center - A workflow automation dashboard for managing Claude Code, Gemini, Codex, and other AI coding agents.

## Features

### Mission Control Interface
- **Command Bar** - Global view of all agents with live status indicators
- **Agent Stations** - Columns act as workflow steps with assigned agents
- **Live Activity** - Real-time agent status on cards without opening modals

### Workflow Pipeline System
- **Column-level Agent Assignment** - Assign AI agents to workflow steps
- **Step Prompts** - Custom system prompts per workflow stage
- **Auto-advance** - Tasks can auto-progress through the pipeline
- **Visual Indicators** - Prompt badges, agent status, activity previews

### Template Boards
Pre-configured workflow templates with agents and prompts:
- **Simple** - Basic 3-column kanban
- **Standard** - Classic 5-column with review
- **Feature Dev** - Full AI-assisted feature pipeline (7 steps, 5 AI)
- **Bug Fix** - Bug investigation workflow (6 steps, 4 AI)
- **Full Pipeline** - Complete 10-step workflow with all stages
- **Documentation** - Docs writing workflow (6 steps, 4 AI)

### Design System
- Mission Control / Cyberpunk Terminal aesthetic
- JetBrains Mono + Orbitron fonts
- Glass morphism with CRT glow effects
- Agent-specific color coding

## Tech Stack

### Web Interface
- **Next.js 16** + React 19 + TypeScript
- **Tailwind CSS v4** + shadcn/ui components
- **@dnd-kit** - Drag and drop
- **Framer Motion** - Animations
- **Zustand** - State management
- **Recharts** + **Graphology** - Visualization & dependency graphs

### Terminal UI (Go)
- **Bubbletea** - TUI framework
- **Lipgloss** - Terminal styling
- **Bubbles** - UI components
- Located in `tui/` subdirectory

## Quick Start

### Web Interface
```bash
npm install
npm run dev
```
Open [http://localhost:4242](http://localhost:4242)

### Terminal UI
```bash
cd tui
go build
./ai-kanban-board-tui
```

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Main board view
│   ├── layout.tsx            # Root layout with fonts
│   ├── globals.css           # Mission Control theme
│   └── api/chat/             # Claude CLI streaming
├── components/
│   ├── board/                # KanbanBoard, KanbanColumn, KanbanCard
│   │   ├── CommandBar.tsx    # Global agent status bar
│   │   ├── AddColumnButton.tsx # Workflow step presets
│   │   ├── ColumnConfigDialog.tsx # Agent + prompt config
│   │   └── BoardSettingsDialog.tsx
│   ├── task/                 # TaskModal, TaskChat, TaskAISettings
│   ├── visualization/        # Charts for dependency graphs
│   ├── sidebar/              # BoardList, CreateBoardDialog
│   └── ui/                   # shadcn components
├── lib/
│   ├── store.ts              # Board/Task Zustand state
│   ├── agent-store.ts        # Custom agent profile store
│   └── constants.ts          # Board templates
└── types/                    # TypeScript definitions

tui/                          # Go terminal UI
├── main.go                   # Entry point
├── model.go                  # Bubbletea Model
├── view.go                   # Rendering
├── backend.go                # YAML/JSON persistence
├── styles.go                 # Terminal theming
└── update_mouse.go           # Drag-drop support
```

## Workflow Configuration

### Assigning Agents to Steps
1. Click the bot icon in any column header
2. Select an agent (Claude, Gemini, Codex, etc.)
3. Open column menu (⋯) → "Configure Step" to add a prompt

### Creating Template Boards
1. Click "+ New Board" in sidebar
2. Choose a workflow template
3. Preview the pipeline and AI steps
4. Create - columns come pre-configured with agents and prompts

## Agent Types Supported
- Claude Code
- Gemini CLI
- OpenAI Codex
- GitHub Copilot
- Amp
- Cursor AI
- Custom

### Custom Agent Profiles
Create custom agent configurations with:
- **AgentProfile** - Name, avatar, description, base type
- **AgentCapabilities** - Skills, MCP servers, subagents, slash commands
- **AgentCLIConfig** - CLI flags, env vars, permission mode

Custom profiles are stored in localStorage via Zustand.

## License

MIT
