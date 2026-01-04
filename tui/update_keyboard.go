package main

import (
	"github.com/charmbracelet/bubbles/textinput"
	tea "github.com/charmbracelet/bubbletea"
)

// handleKeyMsg handles keyboard input
func (m Model) handleKeyMsg(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	// Handle filter input first if filter is active
	if m.filterActive {
		return m.handleFilterKeyMsg(msg)
	}

	// Handle form input first if form is open
	if m.formMode != FormNone {
		return m.handleFormKeyMsg(msg)
	}

	// Handle delete confirmation
	if m.confirmingDelete {
		return m.handleDeleteConfirmation(msg)
	}

	// Global shortcuts
	switch msg.String() {
	case "q", "ctrl+c":
		return m, tea.Quit

	case "?":
		// Toggle help screen
		if m.viewMode == ViewHelp {
			// Return to previous view
			m.viewMode = m.previousView
		} else {
			// Show help
			m.previousView = m.viewMode
			m.viewMode = ViewHelp
		}
		return m, nil

	case "tab":
		m.toggleDetails()
		return m, nil
	}

	// View-specific shortcuts
	switch m.viewMode {
	case ViewBoard:
		return m.handleBoardKeyMsg(msg)
	case ViewHelp:
		return m.handleHelpKeyMsg(msg)
	}

	return m, nil
}

// handleBoardKeyMsg handles keyboard input for board view
func (m Model) handleBoardKeyMsg(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	// Navigation
	case "left", "h":
		m.moveSelectionLeft()
		m.updateScrollOffset()
		m.fetchIssueDetails() // Refresh detail panel
		return m, nil

	case "right", "l":
		m.moveSelectionRight()
		m.updateScrollOffset()
		m.fetchIssueDetails() // Refresh detail panel
		return m, nil

	case "up", "k":
		m.moveSelectionUp()
		m.updateScrollOffset()
		m.fetchIssueDetails() // Refresh detail panel
		return m, nil

	case "down", "j":
		m.moveSelectionDown()
		m.updateScrollOffset()
		m.fetchIssueDetails() // Refresh detail panel
		return m, nil

	// Jump to first/last column
	case "home", "g":
		m.selectedColumn = 0
		m.selectedTask = 0
		m.updateScrollOffset()
		m.fetchIssueDetails() // Refresh detail panel
		return m, nil

	case "end", "G":
		m.selectedColumn = len(m.board.Columns) - 1
		m.selectedTask = 0
		m.updateScrollOffset()
		m.fetchIssueDetails() // Refresh detail panel
		return m, nil

	// Task creation and editing
	case "n":
		// New task
		m.openCreateTaskForm()
		return m, nil

	case "e", "enter":
		// Edit task (Enter also selects/opens the task)
		m.openEditTaskForm()
		return m, nil

	case "d":
		// Show delete confirmation
		task := m.getCurrentTask()
		if task != nil {
			m.confirmingDelete = true
			m.deletingTaskID = task.ID
		}
		return m, nil

	case "m":
		// Move task to next column (quick move)
		m.moveTaskToNextColumn()
		return m, nil

	case "M":
		// Move task to previous column
		m.moveTaskToPrevColumn()
		return m, nil

	case "/":
		// Open filter input
		m.openFilter()
		return m, nil

	case "esc":
		// Clear filter if active
		if m.filterText != "" {
			m.filterText = ""
			return m, nil
		}
	}

	return m, nil
}

// handleFilterKeyMsg handles keyboard input when filter is active
func (m Model) handleFilterKeyMsg(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg.String() {
	case "esc":
		// Cancel filter, restore previous text
		m.closeFilter()
		return m, nil

	case "enter":
		// Apply filter and close filter input
		m.filterText = m.filterInput.Value()
		m.filterActive = false
		return m, nil

	case "ctrl+c":
		// Also cancel filter on ctrl+c
		m.closeFilter()
		return m, nil
	}

	// Update the filter input
	m.filterInput, cmd = m.filterInput.Update(msg)
	return m, cmd
}

// openFilter activates the filter input
func (m *Model) openFilter() {
	m.filterActive = true
	m.filterInput = textinput.New()
	m.filterInput.Placeholder = "Filter tasks..."
	m.filterInput.CharLimit = 100
	m.filterInput.Width = 30
	m.filterInput.SetValue(m.filterText)
	m.filterInput.Focus()
}

// closeFilter deactivates the filter input
func (m *Model) closeFilter() {
	m.filterActive = false
}

// handleHelpKeyMsg handles keyboard input for help view
func (m Model) handleHelpKeyMsg(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "esc", "enter", " ", "?":
		// Return to previous view
		m.viewMode = m.previousView
		return m, nil
	}

	return m, nil
}

// handleFormKeyMsg handles keyboard input when task form is open
func (m Model) handleFormKeyMsg(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	var cmd tea.Cmd

	switch msg.String() {
	case "esc":
		// Cancel form
		m.closeTaskForm()
		return m, nil

	case "ctrl+s", "ctrl+enter":
		// Save form
		m.saveTaskForm()
		return m, nil

	case "ctrl+t":
		// Cycle issue type: task → bug → feature → task
		switch m.formIssueType {
		case "task":
			m.formIssueType = "bug"
		case "bug":
			m.formIssueType = "feature"
		default:
			m.formIssueType = "task"
		}
		return m, nil

	case "ctrl+p":
		// Cycle priority: P0 → P1 → P2 → P3 → P0
		switch m.formPriority {
		case PriorityUrgent:
			m.formPriority = PriorityHigh
		case PriorityHigh:
			m.formPriority = PriorityMedium
		case PriorityMedium:
			m.formPriority = PriorityLow
		default:
			m.formPriority = PriorityUrgent
		}
		return m, nil

	case "tab", "shift+tab", "up", "down":
		// Navigate between form fields
		if msg.String() == "tab" || msg.String() == "down" {
			m.formFocusIndex++
			if m.formFocusIndex >= len(m.formInputs) {
				m.formFocusIndex = 0
			}
		} else {
			m.formFocusIndex--
			if m.formFocusIndex < 0 {
				m.formFocusIndex = len(m.formInputs) - 1
			}
		}

		// Update focus
		for i := range m.formInputs {
			if i == m.formFocusIndex {
				m.formInputs[i].Focus()
			} else {
				m.formInputs[i].Blur()
			}
		}

		return m, nil

	case "enter":
		// Enter on last field saves the form
		if m.formFocusIndex == len(m.formInputs)-1 {
			m.saveTaskForm()
			return m, nil
		}
		// Otherwise move to next field
		m.formFocusIndex++
		if m.formFocusIndex >= len(m.formInputs) {
			m.formFocusIndex = 0
		}
		for i := range m.formInputs {
			if i == m.formFocusIndex {
				m.formInputs[i].Focus()
			} else {
				m.formInputs[i].Blur()
			}
		}
		return m, nil
	}

	// Update the focused text input
	if m.formFocusIndex >= 0 && m.formFocusIndex < len(m.formInputs) {
		m.formInputs[m.formFocusIndex], cmd = m.formInputs[m.formFocusIndex].Update(msg)
	}

	return m, cmd
}

// handleDeleteConfirmation handles keyboard input when showing delete confirmation
func (m Model) handleDeleteConfirmation(msg tea.KeyMsg) (tea.Model, tea.Cmd) {
	switch msg.String() {
	case "y", "Y":
		// Confirm delete
		m.confirmDelete()
		m.confirmingDelete = false
		m.deletingTaskID = ""
		return m, nil

	case "n", "N", "esc":
		// Cancel delete
		m.confirmingDelete = false
		m.deletingTaskID = ""
		return m, nil
	}

	return m, nil
}

// confirmDelete actually deletes the task after confirmation
func (m *Model) confirmDelete() {
	if m.deletingTaskID == "" {
		return
	}

	// Find and delete the task from the board
	for i, t := range m.board.Tasks {
		if t.ID == m.deletingTaskID {
			m.board.Tasks = append(m.board.Tasks[:i], m.board.Tasks[i+1:]...)
			break
		}
	}

	// Remove from columns
	for i := range m.board.Columns {
		for j, t := range m.board.Columns[i].Tasks {
			if t.ID == m.deletingTaskID {
				m.board.Columns[i].Tasks = append(m.board.Columns[i].Tasks[:j], m.board.Columns[i].Tasks[j+1:]...)
				break
			}
		}
	}

	// Save changes
	if m.backend != nil {
		m.backend.SaveBoard(m.board)
	}

	// Adjust selection
	col := m.getCurrentColumn()
	if col != nil && m.selectedTask >= len(col.Tasks) && m.selectedTask > 0 {
		m.selectedTask--
	}
}

// moveTaskToNextColumn moves the current task to the next column
func (m *Model) moveTaskToNextColumn() {
	task := m.getCurrentTask()
	if task == nil {
		return
	}

	nextCol := m.selectedColumn + 1
	if nextCol >= len(m.board.Columns) {
		return // Already at last column
	}

	m.moveTask(m.selectedColumn, m.selectedTask, nextCol, 0)
}

// moveTaskToPrevColumn moves the current task to the previous column
func (m *Model) moveTaskToPrevColumn() {
	task := m.getCurrentTask()
	if task == nil {
		return
	}

	if m.selectedColumn <= 0 {
		return // Already at first column
	}

	prevCol := m.selectedColumn - 1
	m.moveTask(m.selectedColumn, m.selectedTask, prevCol, 0)
}
