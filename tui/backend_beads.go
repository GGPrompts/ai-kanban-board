package main

import (
	"encoding/json"
	"fmt"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

// BeadsBackend implements Backend using the beads CLI (bd command)
type BeadsBackend struct {
	// Cache the board to avoid excessive bd calls
	cachedBoard *Board
	lastLoad    time.Time
	cacheTTL    time.Duration
}

// BeadsIssue represents an issue from bd list --json
type BeadsIssue struct {
	ID              string    `json:"id"`
	Title           string    `json:"title"`
	Description     string    `json:"description"`
	Status          string    `json:"status"` // open, in_progress, closed
	Priority        int       `json:"priority"`
	IssueType       string    `json:"issue_type"`
	CreatedAt       time.Time `json:"created_at"`
	CreatedBy       string    `json:"created_by"`
	UpdatedAt       time.Time `json:"updated_at"`
	Assignee        string    `json:"assignee,omitempty"`
	BlockedBy       []string  `json:"blocked_by,omitempty"`
	Blocking        []string  `json:"blocking,omitempty"`
	DependencyCount int       `json:"dependency_count"`
	DependentCount  int       `json:"dependent_count"`
}

// Column ID to status mapping
const (
	ColBacklog     = "col-1" // open
	ColReady       = "col-2"
	ColInProgress  = "col-3" // in_progress
	ColAIWorking   = "col-4"
	ColReview      = "col-5"
	ColDone        = "col-6" // closed
)

// NewBeadsBackend creates a new beads CLI backend
func NewBeadsBackend() *BeadsBackend {
	return &BeadsBackend{
		cacheTTL: 5 * time.Second, // Refresh every 5 seconds
	}
}

// LoadBoard loads issues from beads and converts to Board format
func (b *BeadsBackend) LoadBoard() (*Board, error) {
	// Use cache if still valid
	if b.cachedBoard != nil && time.Since(b.lastLoad) < b.cacheTTL {
		return b.cachedBoard, nil
	}

	// Run bd list --json
	cmd := exec.Command("bd", "list", "--json")
	output, err := cmd.Output()
	if err != nil {
		// If bd command fails, return empty board
		if b.cachedBoard != nil {
			return b.cachedBoard, nil
		}
		return b.createEmptyBoard(), nil
	}

	// Parse JSON
	var issues []BeadsIssue
	if err := json.Unmarshal(output, &issues); err != nil {
		return nil, fmt.Errorf("failed to parse beads output: %w", err)
	}

	// Create board with standard columns
	board := b.createEmptyBoard()

	// Convert issues to tasks and assign to columns
	for _, issue := range issues {
		task := b.issueToTask(&issue)
		board.Tasks = append(board.Tasks, task)
	}

	// Populate column tasks
	populateColumnTasks(board)

	// Update cache
	b.cachedBoard = board
	b.lastLoad = time.Now()

	return board, nil
}

// createEmptyBoard creates a board with standard columns for beads workflow
func (b *BeadsBackend) createEmptyBoard() *Board {
	now := time.Now()
	return &Board{
		ID:          "beads-board",
		Name:        "Beads Issues",
		Description: "Issues from beads tracker",
		CreatedAt:   now,
		UpdatedAt:   now,
		Columns: []Column{
			{ID: ColBacklog, Title: "Backlog", Color: "border-t-slate-500", Order: 0},
			{ID: ColReady, Title: "Ready", Color: "border-t-cyan-500", Order: 1},
			{ID: ColInProgress, Title: "In Progress", Color: "border-t-yellow-500", Order: 2},
			{ID: ColAIWorking, Title: "AI Working", Color: "border-t-emerald-500", Order: 3, AssignedAgent: AgentClaudeCode},
			{ID: ColReview, Title: "Review", Color: "border-t-pink-500", Order: 4},
			{ID: ColDone, Title: "Done", Color: "border-t-green-500", Order: 5},
		},
		Tasks: []*Task{},
	}
}

// issueToTask converts a BeadsIssue to a Task
func (b *BeadsBackend) issueToTask(issue *BeadsIssue) *Task {
	return &Task{
		ID:          issue.ID,
		Title:       issue.Title,
		Description: issue.Description,
		ColumnID:    b.statusToColumnID(issue.Status),
		Priority:    b.beadsPriorityToPriority(issue.Priority),
		Labels:      []string{issue.IssueType},
		Assignee:    issue.Assignee,
		CreatedAt:   issue.CreatedAt,
		UpdatedAt:   issue.UpdatedAt,
		BlockedBy:   issue.BlockedBy,
		Blocking:    issue.Blocking,
		IsReady:     issue.DependencyCount == 0 && issue.Status == "open",
	}
}

// statusToColumnID maps beads status to column ID
func (b *BeadsBackend) statusToColumnID(status string) string {
	switch status {
	case "open":
		return ColBacklog
	case "in_progress":
		return ColInProgress
	case "closed":
		return ColDone
	default:
		return ColBacklog
	}
}

// columnIDToStatus maps column ID to beads status
func (b *BeadsBackend) columnIDToStatus(columnID string) string {
	switch columnID {
	case ColBacklog, ColReady:
		return "open"
	case ColInProgress, ColAIWorking, ColReview:
		return "in_progress"
	case ColDone:
		return "closed"
	default:
		return "open"
	}
}

// beadsPriorityToPriority converts beads priority (0-4) to Priority enum
func (b *BeadsBackend) beadsPriorityToPriority(bp int) Priority {
	switch bp {
	case 0:
		return PriorityUrgent // P0 = critical/urgent
	case 1:
		return PriorityHigh // P1 = high
	case 2:
		return PriorityMedium // P2 = medium
	case 3, 4:
		return PriorityLow // P3, P4 = low/backlog
	default:
		return PriorityMedium
	}
}

// priorityToBeadsPriority converts Priority enum to beads priority (0-4)
func (b *BeadsBackend) priorityToBeadsPriority(p Priority) int {
	switch p {
	case PriorityUrgent:
		return 0
	case PriorityHigh:
		return 1
	case PriorityMedium:
		return 2
	case PriorityLow:
		return 3
	default:
		return 2
	}
}

// SaveBoard saves the board state - for beads, this is mostly a no-op
// since individual operations update beads directly
func (b *BeadsBackend) SaveBoard(board *Board) error {
	// Update cache
	b.cachedBoard = board
	b.lastLoad = time.Now()
	return nil
}

// MoveTask moves a task to a different column by updating its beads status
func (b *BeadsBackend) MoveTask(taskID string, toColumn string) error {
	newStatus := b.columnIDToStatus(toColumn)

	// Use bd update to change status
	if newStatus == "closed" {
		// Use bd close for closing issues
		cmd := exec.Command("bd", "close", taskID)
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to close issue %s: %w", taskID, err)
		}
	} else {
		// Use bd update for status changes
		cmd := exec.Command("bd", "update", taskID, "--status", newStatus)
		if err := cmd.Run(); err != nil {
			return fmt.Errorf("failed to update issue %s status: %w", taskID, err)
		}
	}

	// Invalidate cache
	b.cachedBoard = nil

	return nil
}

// UpdateTask updates a task's details
func (b *BeadsBackend) UpdateTask(task *Task) error {
	// Build update command with changed fields
	args := []string{"update", task.ID}

	// Update title if provided
	if task.Title != "" {
		args = append(args, "--title", task.Title)
	}

	// Update priority
	args = append(args, "--priority", strconv.Itoa(b.priorityToBeadsPriority(task.Priority)))

	// Update assignee if provided
	if task.Assignee != "" {
		args = append(args, "--assignee", task.Assignee)
	}

	cmd := exec.Command("bd", args...)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to update issue %s: %w", task.ID, err)
	}

	// Invalidate cache
	b.cachedBoard = nil

	return nil
}

// CreateTask creates a new beads issue
func (b *BeadsBackend) CreateTask(title, description, columnID string, priority Priority) (*Task, error) {
	// Determine issue type based on title or default to task
	issueType := "task"
	lowerTitle := strings.ToLower(title)
	if strings.Contains(lowerTitle, "bug") || strings.Contains(lowerTitle, "fix") {
		issueType = "bug"
	} else if strings.Contains(lowerTitle, "feature") {
		issueType = "feature"
	}

	// Build create command
	args := []string{
		"create",
		"--title", title,
		"--type", issueType,
		"--priority", strconv.Itoa(b.priorityToBeadsPriority(priority)),
	}

	if description != "" {
		args = append(args, "--description", description)
	}

	cmd := exec.Command("bd", args...)
	output, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("failed to create issue: %w", err)
	}

	// Parse the created issue ID from output
	// bd create typically outputs something like "Created issue: beads-xxx"
	outputStr := strings.TrimSpace(string(output))
	var issueID string
	if strings.Contains(outputStr, ":") {
		parts := strings.Split(outputStr, ":")
		if len(parts) >= 2 {
			issueID = strings.TrimSpace(parts[len(parts)-1])
		}
	}
	if issueID == "" {
		// Fallback: generate a temporary ID
		issueID = fmt.Sprintf("task-%d", time.Now().UnixNano())
	}

	// If created in a non-Backlog column, update status
	if columnID != ColBacklog && columnID != ColReady {
		status := b.columnIDToStatus(columnID)
		if status != "open" {
			updateCmd := exec.Command("bd", "update", issueID, "--status", status)
			_ = updateCmd.Run() // Best effort
		}
	}

	// Invalidate cache
	b.cachedBoard = nil

	now := time.Now()
	return &Task{
		ID:          issueID,
		Title:       title,
		Description: description,
		ColumnID:    columnID,
		Priority:    priority,
		Labels:      []string{issueType},
		CreatedAt:   now,
		UpdatedAt:   now,
		IsReady:     true,
	}, nil
}

// DeleteTask closes a beads issue (beads doesn't support hard delete)
func (b *BeadsBackend) DeleteTask(taskID string) error {
	// Close the issue instead of deleting
	cmd := exec.Command("bd", "close", taskID, "--reason", "Closed from TUI")
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("failed to close issue %s: %w", taskID, err)
	}

	// Invalidate cache
	b.cachedBoard = nil

	return nil
}
