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

	// Check for column header click (Y=1, after title bar at Y=0)
	const columnHeaderY = 1
	if msg.Y == columnHeaderY {
		colIndex := m.getColumnAtPosition(msg.X, msg.Y)
		if colIndex >= 0 && colIndex < len(m.board.Columns) {
			// Select this column and move to first task
			m.selectedColumn = colIndex
			m.selectedTask = 0
			m.ensureSelectedColumnVisible()
			m.updateScrollOffset()
			m.fetchIssueDetails()
		}
		return m, nil
	}

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
	m.updateScrollOffset()
	m.fetchIssueDetails() // Refresh detail panel

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
// Handles narrow mode where only a subset of columns are visible
func (m Model) getColumnAtPosition(x, y int) int {
	if len(m.board.Columns) == 0 {
		return -1
	}

	// Get visible column range
	startCol, _, visibleCount := m.getVisibleColumnRange()

	// Calculate column width based on visible columns
	colWidth := m.boardWidth / visibleCount

	// In narrow mode with scroll indicators, account for indicator widths
	// Only adjust when there's a left indicator (which implies both indicators)
	xOffset := 0
	if m.narrowMode && m.visibleColumnStart > 0 {
		indicatorWidth := 5
		colWidth = (m.boardWidth - 10) / visibleCount // Adjust for both indicators
		xOffset = indicatorWidth                      // Skip left indicator
	}
	// Note: When only right indicator exists (at start, can scroll right),
	// colWidth stays at boardWidth/visibleCount to match view.go rendering

	// Calculate which visible column was clicked
	adjustedX := x - xOffset
	if adjustedX < 0 {
		return -1 // Clicked on left scroll indicator
	}

	visibleColIndex := adjustedX / colWidth

	if visibleColIndex < 0 || visibleColIndex >= visibleCount {
		return -1
	}

	// Convert to actual column index
	colIndex := startCol + visibleColIndex

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

	// Get the column index
	colIndex := m.getColumnAtPosition(m.mousePressX, 0)

	// Calculate how many tasks are visible (same logic as rendering)
	contentHeight := m.getContentHeight()
	maxStackedTasks := (contentHeight - cardHeight) / 2
	if maxStackedTasks < 0 {
		maxStackedTasks = 0
	}

	tasksToShow := len(col.Tasks)
	if tasksToShow > maxStackedTasks+1 {
		tasksToShow = maxStackedTasks + 1
	}

	// Calculate startIndex the same way the renderer does
	var startIndex int
	if colIndex == m.selectedColumn && m.columnScrollOffset != nil {
		startIndex = m.columnScrollOffset[colIndex]
	} else {
		// Non-selected columns show last tasks (newest at bottom)
		startIndex = len(col.Tasks) - tasksToShow
		if startIndex < 0 {
			startIndex = 0
		}
	}

	// Clamp startIndex (same as rendering)
	maxStart := len(col.Tasks) - tasksToShow
	if maxStart < 0 {
		maxStart = 0
	}
	if startIndex > maxStart {
		startIndex = maxStart
	}

	// Account for scroll indicator if present (adds 1 line)
	if startIndex > 0 {
		relY-- // Subtract the scroll indicator line
		if relY < 0 {
			return startIndex // Clicked on scroll indicator, select first visible task
		}
	}

	// Iterate through stacked cards from TOP to BOTTOM (visually)
	// Each stacked task (except the last) takes 2 lines
	// Last visible task takes full cardHeight
	for i := 0; i < tasksToShow-1; i++ {
		if relY < (i+1)*2 {
			return startIndex + i
		}
	}

	// Check if in last visible card
	lastCardStart := (tasksToShow - 1) * 2
	if relY >= lastCardStart && relY < lastCardStart+cardHeight {
		return startIndex + tasksToShow - 1
	}

	return startIndex + tasksToShow - 1 // Default to last visible task
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

	// Calculate how many tasks are visible (same logic as rendering)
	contentHeight := m.getContentHeight()
	maxStackedTasks := (contentHeight - cardHeight) / 2
	if maxStackedTasks < 0 {
		maxStackedTasks = 0
	}

	tasksToShow := len(col.Tasks)
	if tasksToShow > maxStackedTasks+1 {
		tasksToShow = maxStackedTasks + 1
	}

	// Calculate startIndex the same way the renderer does
	var startIndex int
	if colIndex == m.selectedColumn && m.columnScrollOffset != nil {
		startIndex = m.columnScrollOffset[colIndex]
	} else {
		// Non-selected columns show last tasks (newest at bottom)
		startIndex = len(col.Tasks) - tasksToShow
		if startIndex < 0 {
			startIndex = 0
		}
	}

	// Clamp startIndex (same as rendering)
	maxStart := len(col.Tasks) - tasksToShow
	if maxStart < 0 {
		maxStart = 0
	}
	if startIndex > maxStart {
		startIndex = maxStart
	}

	// Account for scroll indicator if present (adds 1 line)
	if startIndex > 0 {
		relY-- // Subtract the scroll indicator line
		if relY < 0 {
			return colIndex, startIndex // Drop at first visible position
		}
	}

	// Find insert position based on Y coordinate within visible range
	for i := 0; i < tasksToShow; i++ {
		taskY := i * 2 // Each stacked task takes 2 lines
		if relY < taskY+1 {
			return colIndex, startIndex + i
		}
	}

	// Below all visible tasks - insert at end
	return colIndex, len(col.Tasks)
}
