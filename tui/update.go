package main

import (
	tea "github.com/charmbracelet/bubbletea"
)

// Update handles all messages and updates the model (required by Bubbletea)
func (m Model) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.KeyMsg:
		return m.handleKeyMsg(msg)

	case tea.MouseMsg:
		return m.handleMouseMsg(msg)

	case dragStartMsg:
		// Timer expired - start dragging if mouse still held
		if m.mouseHeldDown && m.potentialDrag {
			// Get the task to drag
			if m.dragFromColumn < len(m.board.Columns) {
				col := m.board.Columns[m.dragFromColumn]
				if m.dragFromIndex < len(col.Tasks) {
					m.draggingTask = col.Tasks[m.dragFromIndex]
					m.dropTargetColumn = m.dragFromColumn
					m.dropTargetIndex = m.dragFromIndex
				}
			}
		}
		return m, nil

	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.height = msg.Height
		wasReady := m.ready
		m.ready = true
		m.calculateLayout()
		m.updateScrollOffset() // Recalculate scroll for new size
		if !wasReady {
			m.fetchIssueDetails() // Initial fetch when first ready
		}
		return m, nil

	case boardLoadedMsg:
		if msg.err != nil {
			// Handle error - for now just keep current board
			return m, nil
		}
		m.board = msg.board
		m.fetchIssueDetails() // Refresh detail panel for new board
		return m, nil
	}

	return m, nil
}
