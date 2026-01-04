package main

import (
	"time"

	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
)

// NewModel creates a new Model with the given board
func NewModel(board *Board) Model {
	backend := NewLocalBackend("board.yaml")
	return NewModelWithBackend(board, backend)
}

// NewModelWithBackend creates a new Model with a specific backend
func NewModelWithBackend(board *Board, backend Backend) Model {
	return Model{
		board:            board,
		backend:          backend,
		viewMode:         ViewBoard,
		selectedColumn:   0,
		selectedTask:     0,
		showDetails:      true,  // Start with details panel visible
		width:            0,
		height:           0,
		ready:            false,
		dropTargetColumn: -1, // Initialize drop target as invalid
		dropTargetIndex:  -1,
	}
}

// Init initializes the model (required by Bubbletea)
func (m Model) Init() tea.Cmd {
	return nil
}

// setSize updates the model dimensions and recalculates layout
func (m *Model) setSize(width, height int) {
	m.width = width
	m.height = height
	m.calculateLayout()
}

// calculateLayout computes the board and detail panel widths
func (m *Model) calculateLayout() {
	if m.showDetails {
		// Detail panel visible: Board gets 67%, detail gets 33%
		m.detailWidth = m.width / 3
		m.boardWidth = m.width - m.detailWidth
	} else {
		// Detail panel hidden: Board gets 100%
		m.boardWidth = m.width
		m.detailWidth = 0
	}
}

// getContentHeight returns the height available for content
func (m Model) getContentHeight() int {
	contentHeight := m.height
	contentHeight -= 3 // Title bar (1) + separator (1) + column headers (1)
	contentHeight -= 2 // Status bar (1) + bottom border (1)
	return contentHeight
}

// getCurrentColumn returns the currently selected column
func (m Model) getCurrentColumn() *Column {
	if m.selectedColumn >= 0 && m.selectedColumn < len(m.board.Columns) {
		return &m.board.Columns[m.selectedColumn]
	}
	return nil
}

// getCurrentTask returns the currently selected task
func (m Model) getCurrentTask() *Task {
	col := m.getCurrentColumn()
	if col == nil {
		return nil
	}

	if m.selectedTask >= 0 && m.selectedTask < len(col.Tasks) {
		return col.Tasks[m.selectedTask]
	}
	return nil
}

// toggleDetails toggles the detail panel visibility
func (m *Model) toggleDetails() {
	m.showDetails = !m.showDetails
	m.calculateLayout()
}

// moveSelectionLeft moves the selection to the left column
func (m *Model) moveSelectionLeft() {
	if m.selectedColumn > 0 {
		m.selectedColumn--
		// Adjust task selection to stay within bounds
		col := m.getCurrentColumn()
		if col != nil && m.selectedTask >= len(col.Tasks) {
			if len(col.Tasks) > 0 {
				m.selectedTask = len(col.Tasks) - 1
			} else {
				m.selectedTask = 0
			}
		}
	}
}

// moveSelectionRight moves the selection to the right column
func (m *Model) moveSelectionRight() {
	if m.selectedColumn < len(m.board.Columns)-1 {
		m.selectedColumn++
		// Adjust task selection to stay within bounds
		col := m.getCurrentColumn()
		if col != nil && m.selectedTask >= len(col.Tasks) {
			if len(col.Tasks) > 0 {
				m.selectedTask = len(col.Tasks) - 1
			} else {
				m.selectedTask = 0
			}
		}
	}
}

// moveSelectionUp moves the selection up within the current column
func (m *Model) moveSelectionUp() {
	if m.selectedTask > 0 {
		m.selectedTask--
	}
}

// moveSelectionDown moves the selection down within the current column
func (m *Model) moveSelectionDown() {
	col := m.getCurrentColumn()
	if col != nil && m.selectedTask < len(col.Tasks)-1 {
		m.selectedTask++
	}
}

// moveTask moves a task from one position to another (within or across columns)
func (m *Model) moveTask(fromColIndex, fromTaskIndex, toColIndex, insertIndex int) {
	// Validate indices
	if fromColIndex < 0 || fromColIndex >= len(m.board.Columns) {
		return
	}
	if toColIndex < 0 || toColIndex >= len(m.board.Columns) {
		return
	}

	fromCol := &m.board.Columns[fromColIndex]
	toCol := &m.board.Columns[toColIndex]

	if fromTaskIndex < 0 || fromTaskIndex >= len(fromCol.Tasks) {
		return
	}

	// Get the task to move
	task := fromCol.Tasks[fromTaskIndex]

	// Handle reordering within the same column
	if fromColIndex == toColIndex {
		// Check if actually moving to a different position
		if fromTaskIndex == insertIndex || fromTaskIndex+1 == insertIndex {
			return // No effective move
		}

		// Remove task from source position
		fromCol.Tasks = append(fromCol.Tasks[:fromTaskIndex], fromCol.Tasks[fromTaskIndex+1:]...)

		// Adjust insert index if needed
		adjustedInsertIndex := insertIndex
		if fromTaskIndex < insertIndex {
			adjustedInsertIndex--
		}

		// Insert at new position
		if adjustedInsertIndex >= len(fromCol.Tasks) {
			fromCol.Tasks = append(fromCol.Tasks, task)
		} else {
			fromCol.Tasks = append(fromCol.Tasks[:adjustedInsertIndex], append([]*Task{task}, fromCol.Tasks[adjustedInsertIndex:]...)...)
		}

		m.selectedColumn = toColIndex
		m.selectedTask = adjustedInsertIndex
	} else {
		// Moving to a different column

		// Remove task from source column
		fromCol.Tasks = append(fromCol.Tasks[:fromTaskIndex], fromCol.Tasks[fromTaskIndex+1:]...)

		// Insert into target column at specified position
		if insertIndex >= len(toCol.Tasks) {
			toCol.Tasks = append(toCol.Tasks, task)
			m.selectedTask = len(toCol.Tasks) - 1
		} else {
			toCol.Tasks = append(toCol.Tasks[:insertIndex], append([]*Task{task}, toCol.Tasks[insertIndex:]...)...)
			m.selectedTask = insertIndex
		}

		// Update task's column field
		task.ColumnID = toCol.ID
		m.selectedColumn = toColIndex
	}

	// Update modification time
	task.UpdatedAt = time.Now()

	// Save changes using backend
	if m.backend != nil {
		m.backend.MoveTask(task.ID, toCol.ID)
		m.backend.SaveBoard(m.board)
	}
}

// openCreateTaskForm opens the form for creating a new task
func (m *Model) openCreateTaskForm() {
	m.formMode = FormCreateTask
	m.editingTaskID = ""
	m.formFocusIndex = 0

	// Create text inputs for the form
	titleInput := textinput.New()
	titleInput.Placeholder = "Task title"
	titleInput.CharLimit = 100
	titleInput.Width = 40
	titleInput.Focus()

	descInput := textinput.New()
	descInput.Placeholder = "Description (optional)"
	descInput.CharLimit = 500
	descInput.Width = 40

	m.formInputs = []textinput.Model{titleInput, descInput}
}

// openEditTaskForm opens the form for editing the selected task
func (m *Model) openEditTaskForm() {
	task := m.getCurrentTask()
	if task == nil {
		return
	}

	m.formMode = FormEditTask
	m.editingTaskID = task.ID
	m.formFocusIndex = 0

	// Create text inputs with current values
	titleInput := textinput.New()
	titleInput.Placeholder = "Task title"
	titleInput.CharLimit = 100
	titleInput.Width = 40
	titleInput.SetValue(task.Title)
	titleInput.Focus()

	descInput := textinput.New()
	descInput.Placeholder = "Description (optional)"
	descInput.CharLimit = 500
	descInput.Width = 40
	descInput.SetValue(task.Description)

	m.formInputs = []textinput.Model{titleInput, descInput}
}

// closeTaskForm closes the task form without saving
func (m *Model) closeTaskForm() {
	m.formMode = FormNone
	m.formInputs = nil
	m.editingTaskID = ""
}

// saveTaskForm saves the form data and closes it
func (m *Model) saveTaskForm() {
	if len(m.formInputs) < 2 {
		m.closeTaskForm()
		return
	}

	title := m.formInputs[0].Value()
	description := m.formInputs[1].Value()

	// Don't save empty titles
	if title == "" {
		m.closeTaskForm()
		return
	}

	if m.formMode == FormCreateTask {
		// Create new task
		col := m.getCurrentColumn()
		if col != nil {
			task, err := m.backend.CreateTask(title, description, col.ID, PriorityMedium)
			if err == nil {
				col.Tasks = append(col.Tasks, task)
				m.board.Tasks = append(m.board.Tasks, task)
			}
		}
	} else if m.formMode == FormEditTask {
		// Update existing task
		for _, task := range m.board.Tasks {
			if task.ID == m.editingTaskID {
				task.Title = title
				task.Description = description
				task.UpdatedAt = time.Now()
				m.backend.UpdateTask(task)
				break
			}
		}
	}

	m.closeTaskForm()
}
