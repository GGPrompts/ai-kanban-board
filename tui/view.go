package main

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// View renders the TUI (required by Bubbletea)
func (m Model) View() string {
	if !m.ready {
		return "Loading..."
	}

	// Check minimum size
	if m.width < 80 || m.height < 20 {
		return fmt.Sprintf("Terminal too small (%d x %d). Need at least 80 x 20.", m.width, m.height)
	}

	// Render based on view mode
	switch m.viewMode {
	case ViewBoard:
		return m.renderBoardView()
	case ViewHelp:
		return m.renderHelpView()
	default:
		return m.renderBoardView()
	}
}

// renderBoardView renders the main kanban board
func (m Model) renderBoardView() string {
	var sections []string

	// Title bar
	title := m.renderTitle()
	sections = append(sections, title)

	// Main content area (board + optional detail panel)
	mainContent := m.renderMainContent()
	sections = append(sections, mainContent)

	// Status bar
	status := m.renderStatus()
	sections = append(sections, status)

	boardView := lipgloss.JoinVertical(lipgloss.Left, sections...)

	// Render delete confirmation overlay if confirming
	if m.confirmingDelete {
		return m.renderDeleteConfirmation(boardView)
	}

	// Render form overlay if form is open
	if m.formMode != FormNone {
		return m.renderFormOverlay(boardView)
	}

	return boardView
}

// renderTitle renders the title bar
func (m Model) renderTitle() string {
	boardName := m.board.Name
	viewLabel := "Board View"

	title := fmt.Sprintf("AI Kanban - %s", boardName)
	titleStyle := styleTitle.Width(m.boardWidth)

	if m.showDetails {
		titleStyle = styleTitle.Width(m.width)
	}

	padding := m.width - len(title) - len(viewLabel) - 2
	if padding < 0 {
		padding = 0
	}

	return titleStyle.Render(title + strings.Repeat(" ", padding) + viewLabel)
}

// renderMainContent renders the board and optional detail panel side by side
func (m Model) renderMainContent() string {
	boardContent := m.renderBoard()

	if m.showDetails {
		detailContent := m.renderDetailPanel()

		return lipgloss.JoinHorizontal(
			lipgloss.Top,
			boardContent,
			detailContent,
		)
	}

	return boardContent
}

// renderBoard renders the Kanban board columns and tasks
func (m Model) renderBoard() string {
	contentHeight := m.getContentHeight()

	// Column headers
	headers := m.renderColumnHeaders()

	// Column contents (tasks stacked vertically)
	columns := m.renderColumns(contentHeight)

	// Join headers and columns
	board := lipgloss.JoinVertical(lipgloss.Left, headers, columns)

	return lipgloss.NewStyle().
		Width(m.boardWidth).
		Height(contentHeight + 1).
		Render(board)
}

// renderColumnHeaders renders the column headers with task counts
func (m Model) renderColumnHeaders() string {
	var headers []string

	for i, col := range m.board.Columns {
		count := len(col.Tasks)
		label := fmt.Sprintf("%s (%d)", col.Title, count)

		// Get terminal color from Tailwind class
		termColor := GetTerminalColor(col.Color)

		// Use selected style if this column is selected
		style := styleColumnHeader.Foreground(termColor)
		if i == m.selectedColumn {
			style = styleColumnHeaderSelected
		}

		// Each column gets equal width
		colWidth := m.boardWidth / len(m.board.Columns)
		headers = append(headers, style.Width(colWidth).Render(label))
	}

	return lipgloss.JoinHorizontal(lipgloss.Top, headers...)
}

// renderColumns renders all columns with their tasks
func (m Model) renderColumns(contentHeight int) string {
	var columns []string
	colWidth := m.boardWidth / len(m.board.Columns)

	for i, col := range m.board.Columns {
		columnContent := m.renderColumn(col, i, contentHeight, colWidth)
		columns = append(columns, columnContent)
	}

	return lipgloss.JoinHorizontal(lipgloss.Top, columns...)
}

// renderColumn renders a single column with its tasks using Solitaire-style stacking
func (m Model) renderColumn(col Column, colIndex int, contentHeight int, colWidth int) string {
	var columnContent strings.Builder

	// Check if we should show drop indicator in this column
	showDropIndicator := m.draggingTask != nil && m.dropTargetColumn == colIndex

	// Empty column
	if len(col.Tasks) == 0 {
		if showDropIndicator && m.dropTargetIndex == 0 {
			dropLine := strings.Repeat("-", cardWidth)
			columnContent.WriteString(styleDropIndicator.Render(dropLine) + "\n")
		}

		return lipgloss.NewStyle().
			Width(colWidth).
			Height(contentHeight).
			Align(lipgloss.Center).
			Render(columnContent.String())
	}

	// Calculate how many tasks we can show with stacking
	maxStackedTasks := (contentHeight - cardHeight) / 2
	if maxStackedTasks < 0 {
		maxStackedTasks = 0
	}

	tasksToShow := len(col.Tasks)
	if tasksToShow > maxStackedTasks+1 {
		tasksToShow = maxStackedTasks + 1
	}

	startIndex := len(col.Tasks) - tasksToShow
	if startIndex < 0 {
		startIndex = 0
	}

	for i := startIndex; i < len(col.Tasks); i++ {
		// Show drop indicator before this task if needed
		if showDropIndicator && m.dropTargetIndex == i {
			dropLine := strings.Repeat("-", cardWidth)
			columnContent.WriteString(styleDropIndicator.Render(dropLine) + "\n")
		}

		task := col.Tasks[i]
		isLast := i == len(col.Tasks)-1
		isSelected := colIndex == m.selectedColumn && i == m.selectedTask

		// Check if this is the task being dragged
		isDragging := m.draggingTask != nil && m.dragFromColumn == colIndex && i == m.dragFromIndex

		if isLast {
			// Last task - show full card
			if isDragging {
				columnContent.WriteString(renderCardGhost(task.Title))
			} else {
				columnContent.WriteString(renderCard(task.Title, isSelected))
			}
		} else {
			// Stacked task - show only top 2 lines
			if isDragging {
				columnContent.WriteString(renderCardTopLinesGhost(task.Title))
			} else {
				columnContent.WriteString(renderCardTopLines(task.Title, isSelected))
			}
			columnContent.WriteString("\n")
		}
	}

	// Show drop indicator at end if needed
	if showDropIndicator && m.dropTargetIndex == len(col.Tasks) {
		dropLine := strings.Repeat("-", cardWidth)
		columnContent.WriteString("\n" + styleDropIndicator.Render(dropLine))
	}

	return lipgloss.NewStyle().
		Width(colWidth).
		Height(contentHeight).
		Align(lipgloss.Center).
		Render(columnContent.String())
}

// renderDetailPanel renders the detail panel for the selected task
func (m Model) renderDetailPanel() string {
	task := m.getCurrentTask()

	var content strings.Builder

	if task == nil {
		content.WriteString(styleSubdued.Render("No task selected"))
	} else {
		// Title
		content.WriteString(styleDetailTitle.Render(task.Title))
		content.WriteString("\n\n")

		// Priority
		content.WriteString(styleDetailLabel.Render("Priority: "))
		content.WriteString(renderPriorityBadge(task.Priority))
		content.WriteString(" " + task.Priority.String())
		content.WriteString("\n\n")

		// Description
		if task.Description != "" {
			content.WriteString(styleDetailLabel.Render("Description:"))
			content.WriteString("\n")
			content.WriteString(styleDetailValue.Render(task.Description))
			content.WriteString("\n\n")
		}

		// Agent info
		if task.Agent != nil {
			content.WriteString(styleDetailLabel.Render("Agent: "))
			content.WriteString(renderAgentBadge(task.Agent))
			content.WriteString(" " + string(task.Agent.Type))
			content.WriteString("\n\n")
		}

		// Labels
		if len(task.Labels) > 0 {
			content.WriteString(styleDetailLabel.Render("Labels: "))
			for _, label := range task.Labels {
				content.WriteString(styleLabel.Render(label))
			}
			content.WriteString("\n\n")
		}

		// Blocked by
		if len(task.BlockedBy) > 0 {
			content.WriteString(styleDetailLabel.Render("Blocked by: "))
			content.WriteString(strings.Join(task.BlockedBy, ", "))
			content.WriteString("\n\n")
		}

		// Git info
		if task.Git != nil && task.Git.Branch != "" {
			content.WriteString(styleDetailLabel.Render("Branch: "))
			content.WriteString(styleDetailValue.Render(task.Git.Branch))
			content.WriteString("\n")
			if task.Git.PRUrl != "" {
				content.WriteString(styleDetailLabel.Render("PR: "))
				content.WriteString(styleDetailValue.Render(task.Git.PRUrl))
				content.WriteString("\n")
			}
		}
	}

	return styleDetailPanel.
		Width(m.detailWidth - 2).
		Height(m.getContentHeight()).
		Render(content.String())
}

// renderStatus renders the status bar
func (m Model) renderStatus() string {
	col := m.getCurrentColumn()
	var colName string
	if col != nil {
		colName = col.Title
	}

	task := m.getCurrentTask()
	var taskInfo string
	if task != nil {
		taskInfo = fmt.Sprintf(" | Task: %s", task.Title)
		if len(taskInfo) > 40 {
			taskInfo = taskInfo[:37] + "..."
		}
	}

	status := fmt.Sprintf("Column: %s%s | ? Help | Tab Toggle Details | q Quit", colName, taskInfo)

	return styleStatus.Width(m.width).Render(status)
}

// renderDeleteConfirmation renders a delete confirmation overlay
func (m Model) renderDeleteConfirmation(background string) string {
	overlay := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(colorDanger).
		Padding(1, 2).
		Render("Delete this task? (y/n)")

	// Center the overlay on the background
	return lipgloss.Place(m.width, m.height, lipgloss.Center, lipgloss.Center, overlay)
}

// renderFormOverlay renders a form overlay for creating/editing tasks
func (m Model) renderFormOverlay(background string) string {
	var title string
	if m.formMode == FormCreateTask {
		title = "New Task"
	} else {
		title = "Edit Task"
	}

	var formContent strings.Builder
	formContent.WriteString(styleDetailTitle.Render(title))
	formContent.WriteString("\n\n")

	labels := []string{"Title:", "Description:"}
	for i, input := range m.formInputs {
		formContent.WriteString(styleDetailLabel.Render(labels[i]))
		formContent.WriteString("\n")
		formContent.WriteString(input.View())
		formContent.WriteString("\n\n")
	}

	formContent.WriteString(styleSubdued.Render("Ctrl+S: Save | Esc: Cancel"))

	overlay := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(colorPrimary).
		Padding(1, 2).
		Width(50).
		Render(formContent.String())

	return lipgloss.Place(m.width, m.height, lipgloss.Center, lipgloss.Center, overlay)
}

// renderHelpView renders the help screen
func (m Model) renderHelpView() string {
	var sections []string

	// Title
	title := styleTitle.Width(m.width).Render("AI Kanban TUI - Help")
	sections = append(sections, title)

	helpContent := `
NAVIGATION
  arrows or h/j/k/l   Move between columns and tasks
  Home or g           Jump to first column
  End or G            Jump to last column

ACTIONS
  n                   Create new task
  e                   Edit selected task
  d                   Delete selected task
  m                   Move task to next column
  M                   Move task to previous column
  Mouse drag          Drag & drop tasks between columns

VIEW
  Tab                 Toggle detail panel
  ?                   Toggle this help screen

QUIT
  q or Ctrl+C         Exit the application

Press any key to return to the board...
`

	helpStyle := lipgloss.NewStyle().
		Padding(2, 4).
		Width(m.width)

	sections = append(sections, helpStyle.Render(helpContent))

	return lipgloss.JoinVertical(lipgloss.Left, sections...)
}
