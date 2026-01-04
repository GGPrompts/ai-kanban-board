package main

import (
	"time"

	"github.com/charmbracelet/bubbles/textinput"
)

// Priority levels matching ai-kanban-board's TypeScript types
type Priority int

const (
	PriorityLow Priority = iota
	PriorityMedium
	PriorityHigh
	PriorityUrgent
)

func (p Priority) String() string {
	switch p {
	case PriorityLow:
		return "low"
	case PriorityMedium:
		return "medium"
	case PriorityHigh:
		return "high"
	case PriorityUrgent:
		return "urgent"
	}
	return "medium"
}

// AgentType matches ai-kanban-board's agent types
type AgentType string

const (
	AgentClaudeCode AgentType = "claude-code"
	AgentGeminiCLI  AgentType = "gemini-cli"
	AgentCodex      AgentType = "codex"
	AgentCopilot    AgentType = "copilot"
	AgentAmp        AgentType = "amp"
	AgentCursor     AgentType = "cursor"
	AgentCustom     AgentType = "custom"
)

// AgentStatus matches ai-kanban-board's agent status
type AgentStatus string

const (
	AgentIdle      AgentStatus = "idle"
	AgentRunning   AgentStatus = "running"
	AgentPaused    AgentStatus = "paused"
	AgentCompleted AgentStatus = "completed"
	AgentFailed    AgentStatus = "failed"
)

// Task represents a single task card (matches ai-kanban-board's Task)
type Task struct {
	ID          string    `yaml:"id" json:"id"`
	Title       string    `yaml:"title" json:"title"`
	Description string    `yaml:"description,omitempty" json:"description,omitempty"`
	ColumnID    string    `yaml:"column_id" json:"columnId"`
	Order       int       `yaml:"order" json:"order"`
	Priority    Priority  `yaml:"priority" json:"priority"`
	Labels      []string  `yaml:"labels,omitempty" json:"labels,omitempty"`
	Assignee    string    `yaml:"assignee,omitempty" json:"assignee,omitempty"`
	Estimate    string    `yaml:"estimate,omitempty" json:"estimate,omitempty"`
	DueDate     string    `yaml:"due_date,omitempty" json:"dueDate,omitempty"`
	CreatedAt   time.Time `yaml:"created_at" json:"createdAt"`
	UpdatedAt   time.Time `yaml:"updated_at" json:"updatedAt"`

	// Agent integration
	Agent *AgentInfo `yaml:"agent,omitempty" json:"agent,omitempty"`

	// Dependency graph
	BlockedBy    []string `yaml:"blocked_by,omitempty" json:"blockedBy,omitempty"`
	Blocking     []string `yaml:"blocking,omitempty" json:"blocking,omitempty"`
	IsReady      bool     `yaml:"is_ready,omitempty" json:"isReady,omitempty"`
	CriticalPath bool     `yaml:"critical_path,omitempty" json:"criticalPath,omitempty"`

	// Git integration
	Git *GitInfo `yaml:"git,omitempty" json:"git,omitempty"`
}

// AgentInfo represents AI agent state for a task
type AgentInfo struct {
	Type      AgentType   `yaml:"type" json:"type"`
	Status    AgentStatus `yaml:"status" json:"status"`
	SessionID string      `yaml:"session_id,omitempty" json:"sessionId,omitempty"`
	StartedAt *time.Time  `yaml:"started_at,omitempty" json:"startedAt,omitempty"`
	Logs      []string    `yaml:"logs,omitempty" json:"logs,omitempty"`
}

// GitInfo represents git integration state
type GitInfo struct {
	Worktree   string `yaml:"worktree,omitempty" json:"worktree,omitempty"`
	Branch     string `yaml:"branch,omitempty" json:"branch,omitempty"`
	BaseBranch string `yaml:"base_branch,omitempty" json:"baseBranch,omitempty"`
	PRNumber   int    `yaml:"pr_number,omitempty" json:"prNumber,omitempty"`
	PRStatus   string `yaml:"pr_status,omitempty" json:"prStatus,omitempty"`
	PRUrl      string `yaml:"pr_url,omitempty" json:"prUrl,omitempty"`
}

// Column represents a column in the Kanban board
type Column struct {
	ID          string  `yaml:"id" json:"id"`
	Title       string  `yaml:"title" json:"title"`
	Color       string  `yaml:"color" json:"color"` // Tailwind class e.g., 'border-t-emerald-500'
	Order       int     `yaml:"order" json:"order"`
	WIPLimit    int     `yaml:"wip_limit,omitempty" json:"wipLimit,omitempty"`
	IsCollapsed bool    `yaml:"is_collapsed,omitempty" json:"isCollapsed,omitempty"`
	Tasks       []*Task `yaml:"-" json:"-"` // Populated at runtime from Board.Tasks

	// Agent configuration for this column
	AssignedAgent AgentType `yaml:"assigned_agent,omitempty" json:"assignedAgent,omitempty"`
}

// Board represents the entire Kanban board
type Board struct {
	ID          string    `yaml:"id" json:"id"`
	Name        string    `yaml:"name" json:"name"`
	Description string    `yaml:"description,omitempty" json:"description,omitempty"`
	Columns     []Column  `yaml:"columns" json:"columns"`
	Tasks       []*Task   `yaml:"tasks" json:"tasks"`
	CreatedAt   time.Time `yaml:"created_at" json:"createdAt"`
	UpdatedAt   time.Time `yaml:"updated_at" json:"updatedAt"`
}

// ViewMode represents the current view (board, table, or help)
type ViewMode int

const (
	ViewBoard ViewMode = iota
	ViewTable
	ViewHelp
)

// FormMode represents the current form state
type FormMode int

const (
	FormNone       FormMode = iota // No form active
	FormCreateTask                 // Creating a new task
	FormEditTask                   // Editing an existing task
)

// Model is the Bubbletea model for the TUI application
type Model struct {
	// Data
	board   *Board
	backend Backend

	// UI State
	viewMode       ViewMode
	previousView   ViewMode // View to return to after help
	selectedColumn int      // Which column is selected
	selectedTask   int      // Which task in the column is selected
	showDetails    bool     // Show detail panel
	width          int
	height         int

	// Layout (calculated from width/height)
	boardWidth  int // Width of the board area
	detailWidth int // Width of detail panel

	// Keyboard/Mouse state
	ready bool

	// Mouse drag state (Solitaire pattern)
	draggingTask   *Task     // Task currently being dragged
	dragFromColumn int       // Which column the drag started from
	dragFromIndex  int       // Task index in the source column
	mousePressX    int       // X position where mouse was pressed
	mousePressY    int       // Y position where mouse was pressed
	mouseHeldDown  bool      // Whether mouse button is currently held
	potentialDrag  bool      // Whether we're waiting to see if this becomes a drag
	dragStartTime  time.Time // When the mouse was pressed (for drag delay)

	// Drop target tracking (for visual feedback)
	dropTargetColumn int // Column where task would be dropped (-1 if none)
	dropTargetIndex  int // Position where task would be inserted

	// Scroll state per column (tracks first visible task index)
	columnScrollOffset map[int]int

	// Task form state (for creating/editing tasks)
	formMode       FormMode          // Whether we're creating or editing a task
	formInputs     []textinput.Model // Text inputs for the form
	formFocusIndex int               // Which input is currently focused
	editingTaskID  string            // ID of task being edited (empty if creating)

	// Delete confirmation
	confirmingDelete bool   // Whether we're showing delete confirmation
	deletingTaskID   string // ID of task pending deletion

	// Double-click detection
	lastClickTime time.Time
	lastClickX    int
	lastClickY    int

	// Filter state
	filterActive bool            // Whether filter mode is active
	filterInput  textinput.Model // Text input for filtering
	filterText   string          // Current filter text (applied when Enter pressed)

	// Responsive layout state
	narrowMode         bool // Whether we're in narrow/responsive mode
	visibleColumnStart int  // First visible column index (for horizontal scrolling)
	visibleColumnCount int  // Number of columns that can fit on screen
	minColumnWidth     int  // Minimum readable column width (set to 18 for cardWidth + padding)
}

// boardLoadedMsg is sent when the board has been loaded
type boardLoadedMsg struct {
	board *Board
	err   error
}
