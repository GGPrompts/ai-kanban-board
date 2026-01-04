package main

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"gopkg.in/yaml.v3"
)

// Backend interface defines methods for board persistence
type Backend interface {
	LoadBoard() (*Board, error)
	SaveBoard(*Board) error
	MoveTask(taskID string, toColumn string) error
	UpdateTask(task *Task) error
	CreateTask(title, description, columnID, issueType string, priority Priority) (*Task, error)
	DeleteTask(taskID string) error
}

// LocalBackend implements Backend using local YAML/JSON files
type LocalBackend struct {
	filePath string
}

// NewLocalBackend creates a new local file backend
func NewLocalBackend(filePath string) *LocalBackend {
	return &LocalBackend{filePath: filePath}
}

// LoadBoard loads from YAML or JSON file
func (l *LocalBackend) LoadBoard() (*Board, error) {
	data, err := os.ReadFile(l.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			// Return default board if file doesn't exist
			return CreateDefaultBoard(), nil
		}
		return nil, err
	}

	var board Board

	// Try JSON first, then YAML
	if err := json.Unmarshal(data, &board); err != nil {
		if err := yaml.Unmarshal(data, &board); err != nil {
			return nil, fmt.Errorf("failed to parse board file: %w", err)
		}
	}

	// Populate column Tasks from board Tasks
	populateColumnTasks(&board)

	return &board, nil
}

// SaveBoard saves to YAML file
func (l *LocalBackend) SaveBoard(board *Board) error {
	board.UpdatedAt = time.Now()

	data, err := yaml.Marshal(board)
	if err != nil {
		return err
	}

	return os.WriteFile(l.filePath, data, 0644)
}

// MoveTask moves a task to a different column
func (l *LocalBackend) MoveTask(taskID string, toColumn string) error {
	board, err := l.LoadBoard()
	if err != nil {
		return err
	}

	// Find and update the task
	for _, task := range board.Tasks {
		if task.ID == taskID {
			task.ColumnID = toColumn
			task.UpdatedAt = time.Now()
			break
		}
	}

	return l.SaveBoard(board)
}

// UpdateTask updates a task's details
func (l *LocalBackend) UpdateTask(task *Task) error {
	board, err := l.LoadBoard()
	if err != nil {
		return err
	}

	// Find and update the task
	for i, t := range board.Tasks {
		if t.ID == task.ID {
			task.UpdatedAt = time.Now()
			board.Tasks[i] = task
			break
		}
	}

	return l.SaveBoard(board)
}

// CreateTask creates a new task
func (l *LocalBackend) CreateTask(title, description, columnID, issueType string, priority Priority) (*Task, error) {
	board, err := l.LoadBoard()
	if err != nil {
		return nil, err
	}

	// Generate new ID
	maxID := 0
	for _, task := range board.Tasks {
		var id int
		fmt.Sscanf(task.ID, "task-%d", &id)
		if id > maxID {
			maxID = id
		}
	}

	// Default to "task" if no type specified
	if issueType == "" {
		issueType = "task"
	}

	now := time.Now()
	newTask := &Task{
		ID:          fmt.Sprintf("task-%d", maxID+1),
		Title:       title,
		Description: description,
		ColumnID:    columnID,
		Priority:    priority,
		Labels:      []string{issueType},
		CreatedAt:   now,
		UpdatedAt:   now,
		IsReady:     true,
	}

	board.Tasks = append(board.Tasks, newTask)

	if err := l.SaveBoard(board); err != nil {
		return nil, err
	}

	return newTask, nil
}

// DeleteTask removes a task from the board
func (l *LocalBackend) DeleteTask(taskID string) error {
	board, err := l.LoadBoard()
	if err != nil {
		return err
	}

	// Remove task from tasks slice
	for i, t := range board.Tasks {
		if t.ID == taskID {
			board.Tasks = append(board.Tasks[:i], board.Tasks[i+1:]...)
			break
		}
	}

	return l.SaveBoard(board)
}

// populateColumnTasks populates each column's Tasks slice from the board's Tasks
func populateColumnTasks(board *Board) {
	// Clear existing column tasks
	for i := range board.Columns {
		board.Columns[i].Tasks = nil
	}

	// Assign tasks to columns
	for _, task := range board.Tasks {
		for i := range board.Columns {
			if board.Columns[i].ID == task.ColumnID {
				board.Columns[i].Tasks = append(board.Columns[i].Tasks, task)
				break
			}
		}
	}
}

// CreateDefaultBoard creates a default board with standard columns
func CreateDefaultBoard() *Board {
	now := time.Now()
	return &Board{
		ID:          "board-1",
		Name:        "AI Kanban Board",
		Description: "AI Agent Orchestration Board",
		CreatedAt:   now,
		UpdatedAt:   now,
		Columns: []Column{
			{ID: "col-1", Title: "Backlog", Color: "border-t-slate-500", Order: 0},
			{ID: "col-2", Title: "Ready", Color: "border-t-cyan-500", Order: 1},
			{ID: "col-3", Title: "In Progress", Color: "border-t-yellow-500", Order: 2},
			{ID: "col-4", Title: "AI Working", Color: "border-t-emerald-500", Order: 3, AssignedAgent: AgentClaudeCode},
			{ID: "col-5", Title: "Review", Color: "border-t-pink-500", Order: 4},
			{ID: "col-6", Title: "Done", Color: "border-t-green-500", Order: 5},
		},
		Tasks: []*Task{},
	}
}

// LoadBoard loads a board from a file path
func LoadBoard(filePath string) (*Board, error) {
	backend := NewLocalBackend(filePath)
	return backend.LoadBoard()
}

// SaveBoard saves a board to a file path
func SaveBoard(filePath string, board *Board) error {
	backend := NewLocalBackend(filePath)
	return backend.SaveBoard(board)
}
