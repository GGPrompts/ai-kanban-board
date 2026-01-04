package main

import (
	"time"

	tea "github.com/charmbracelet/bubbletea"
)

// handleMouseMsg handles mouse input
func (m Model) handleMouseMsg(msg tea.MouseMsg) (tea.Model, tea.Cmd) {
	// Handle mouse based on view mode
	switch m.viewMode {
	case ViewBoard:
		return m.handleBoardMouseMsg(msg)
	default:
		return m, nil
	}
}

// handleBoardMouseMsg handles mouse input for board view
func (m Model) handleBoardMouseMsg(msg tea.MouseMsg) (tea.Model, tea.Cmd) {
	switch msg.Button {
	case tea.MouseButtonLeft:
		if msg.Action == tea.MouseActionPress {
			return m.handleMousePress(msg)
		} else if msg.Action == tea.MouseActionRelease {
			return m.handleMouseRelease(msg)
		} else if msg.Action == tea.MouseActionMotion && m.draggingTask != nil {
			// Motion while left button held (dragging)
			return m.handleMouseMotion(msg)
		}
	case tea.MouseButtonNone:
		// Mouse motion without button - update drop target if dragging
		if msg.Action == tea.MouseActionMotion && m.draggingTask != nil {
			return m.handleMouseMotion(msg)
		}
	}

	return m, nil
}

// handleMouseMotion updates the drop target during drag
func (m Model) handleMouseMotion(msg tea.MouseMsg) (tea.Model, tea.Cmd) {
	// Only update drop target if actually dragging (not just potential drag)
	if m.draggingTask != nil {
		// Update drop target for visual feedback
		colIndex, insertIndex := m.getDropPosition(msg.X, msg.Y)
		m.dropTargetColumn = colIndex
		m.dropTargetIndex = insertIndex
	}

	// If mouse moved significantly while in potential drag, cancel the selection
	// and start dragging immediately (without waiting for timer)
	if m.potentialDrag && m.mouseHeldDown {
		dx := msg.X - m.mousePressX
		dy := msg.Y - m.mousePressY
		distanceMoved := dx*dx + dy*dy

		// If moved more than 4 pixels, start dragging immediately
		if distanceMoved > 4 {
			// Get the task to drag
			if m.dragFromColumn < len(m.board.Columns) {
				col := m.board.Columns[m.dragFromColumn]
				if m.dragFromIndex < len(col.Tasks) {
					m.draggingTask = col.Tasks[m.dragFromIndex]
					m.dropTargetColumn = m.dragFromColumn
					m.dropTargetIndex = m.dragFromIndex
					m.potentialDrag = false
				}
			}
		}
	}

	return m, nil
}

// handleMousePress handles mouse button press (start potential drag)
func (m Model) handleMousePress(msg tea.MouseMsg) (tea.Model, tea.Cmd) {
	// Store press position and time
	m.mousePressX = msg.X
	m.mousePressY = msg.Y
	m.dragStartTime = time.Now()
	m.mouseHeldDown = true

	// Get column
	colIndex := m.getColumnAtPosition(msg.X, msg.Y)
	if colIndex == -1 {
		return m, nil
	}

	if colIndex >= len(m.board.Columns) {
		return m, nil
	}

	col := m.board.Columns[colIndex]
	if len(col.Tasks) == 0 {
		return m, nil // Can't drag from empty column
	}

	// Calculate which task was clicked
	const taskAreaStartY = 3
	relY := msg.Y - taskAreaStartY
	taskIndex := m.getTaskIndexInColumn(col, relY)

	if taskIndex < 0 || taskIndex >= len(col.Tasks) {
		return m, nil
	}

	// Immediately select the task (visual feedback)
	m.selectedColumn = colIndex
	m.selectedTask = taskIndex

	// Store potential drag info but don't start dragging yet
	m.potentialDrag = true
	m.dragFromColumn = colIndex
	m.dragFromIndex = taskIndex

	// Start a timer to initiate drag after delay
	return m, tickCmd()
}

// handleMouseRelease handles mouse button release (drop or click)
func (m Model) handleMouseRelease(msg tea.MouseMsg) (tea.Model, tea.Cmd) {
	// Clear mouse held state
	m.mouseHeldDown = false

	// If we were actually dragging, handle the drop
	if m.draggingTask != nil {
		// Get drop position
		toColIndex, insertIndex := m.getDropPosition(msg.X, msg.Y)

		if toColIndex != -1 {
			// Move task to the target position
			m.moveTask(m.dragFromColumn, m.dragFromIndex, toColIndex, insertIndex)
		}

		// Clear drag state
		m.draggingTask = nil
		m.dropTargetColumn = -1
		m.dropTargetIndex = -1
	}

	// Clear potential drag state
	m.potentialDrag = false
	m.dragFromColumn = -1
	m.dragFromIndex = -1

	return m, nil
}

// getColumnAtPosition returns the column index at the given screen position
func (m Model) getColumnAtPosition(x, y int) int {
	if len(m.board.Columns) == 0 {
		return -1
	}

	colWidth := m.boardWidth / len(m.board.Columns)
	colIndex := x / colWidth

	if colIndex < 0 || colIndex >= len(m.board.Columns) {
		return -1
	}

	return colIndex
}

// getTaskIndexInColumn returns the task index within a column at the given relative Y position
func (m Model) getTaskIndexInColumn(col Column, relY int) int {
	if len(col.Tasks) == 0 {
		return -1
	}

	// Each stacked task takes 2 lines (top lines only)
	// Last task takes full card height
	numTasks := len(col.Tasks)

	// Calculate position based on stacking
	// First (numTasks-1) tasks take 2 lines each
	// Last task takes cardHeight lines
	for i := 0; i < numTasks-1; i++ {
		if relY < (i+1)*2 {
			return i
		}
	}

	// Check if in last card
	lastCardStart := (numTasks - 1) * 2
	if relY >= lastCardStart && relY < lastCardStart+cardHeight {
		return numTasks - 1
	}

	return numTasks - 1 // Default to last card
}

// getDropPosition returns the column and insert index for a drop at the given position
func (m Model) getDropPosition(x, y int) (int, int) {
	colIndex := m.getColumnAtPosition(x, y)
	if colIndex == -1 {
		return -1, -1
	}

	if colIndex >= len(m.board.Columns) {
		return -1, -1
	}

	col := m.board.Columns[colIndex]

	// Calculate insert position
	const taskAreaStartY = 3
	relY := y - taskAreaStartY

	if len(col.Tasks) == 0 {
		return colIndex, 0 // Insert at beginning of empty column
	}

	// Find insert position based on Y coordinate
	numTasks := len(col.Tasks)
	for i := 0; i < numTasks; i++ {
		taskY := i * 2 // Each stacked task takes 2 lines
		if relY < taskY+1 {
			return colIndex, i
		}
	}

	// Below all tasks - insert at end
	return colIndex, numTasks
}
