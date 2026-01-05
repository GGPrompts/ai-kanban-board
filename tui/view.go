package main

import (
	"fmt"
	"strings"
	"time"

	"github.com/charmbracelet/lipgloss"
)

// View renders the TUI (required by Bubbletea)
func (m Model) View() string {
	if !m.ready {
		return "Loading..."
	}

	// Check minimum size - reduced for narrow mode support
	minWidth := 40 // Allow narrower terminals with responsive column layout
	if m.width < minWidth || m.height < 20 {
		return fmt.Sprintf("Terminal too small (%d x %d). Need at least %d x 20.", m.width, m.height, minWidth)
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

	// Determine which columns to render
	startCol, endCol, visibleCount := m.getVisibleColumnRange()
	colWidth := m.boardWidth / visibleCount

	// Left scroll indicator if in narrow mode and not at start
	if m.narrowMode && m.visibleColumnStart > 0 {
		indicator := fmt.Sprintf("◀ %d", m.visibleColumnStart)
		indicatorWidth := 5
		headers = append(headers, lipgloss.NewStyle().
			Width(indicatorWidth).
			Foreground(colorSecondary).
			Bold(true).
			Render(indicator))
		colWidth = (m.boardWidth - 10) / visibleCount // Adjust for indicators
	}

	for i := startCol; i < endCol; i++ {
		col := m.board.Columns[i]
		count := len(col.Tasks)
		label := fmt.Sprintf("%s (%d)", col.Title, count)

		// Get terminal color from Tailwind class
		termColor := GetTerminalColor(col.Color)

		// Use selected style if this column is selected
		style := styleColumnHeader.Foreground(termColor)
		if i == m.selectedColumn {
			style = styleColumnHeaderSelected
		}

		headers = append(headers, style.Width(colWidth).Render(label))
	}

	// Right scroll indicator if in narrow mode and not at end
	if m.narrowMode && endCol < len(m.board.Columns) {
		remaining := len(m.board.Columns) - endCol
		indicator := fmt.Sprintf("%d ▶", remaining)
		indicatorWidth := 5
		headers = append(headers, lipgloss.NewStyle().
			Width(indicatorWidth).
			Foreground(colorSecondary).
			Bold(true).
			Align(lipgloss.Right).
			Render(indicator))
	}

	return lipgloss.JoinHorizontal(lipgloss.Top, headers...)
}

// getVisibleColumnRange returns the start index, end index, and count of visible columns
func (m Model) getVisibleColumnRange() (start, end, count int) {
	if !m.narrowMode || m.visibleColumnCount <= 0 {
		// Show all columns
		return 0, len(m.board.Columns), len(m.board.Columns)
	}

	start = m.visibleColumnStart
	end = m.visibleColumnStart + m.visibleColumnCount
	if end > len(m.board.Columns) {
		end = len(m.board.Columns)
	}
	count = m.visibleColumnCount
	return start, end, count
}

// renderColumns renders all columns with their tasks
func (m Model) renderColumns(contentHeight int) string {
	var columns []string

	// Determine which columns to render
	startCol, endCol, visibleCount := m.getVisibleColumnRange()
	colWidth := m.boardWidth / visibleCount

	// Left scroll indicator space if in narrow mode and not at start
	if m.narrowMode && m.visibleColumnStart > 0 {
		indicatorWidth := 5
		colWidth = (m.boardWidth - 10) / visibleCount // Adjust for indicators
		// Empty space for left indicator alignment with header
		columns = append(columns, lipgloss.NewStyle().
			Width(indicatorWidth).
			Height(contentHeight).
			Render(""))
	}

	for i := startCol; i < endCol; i++ {
		col := m.board.Columns[i]
		columnContent := m.renderColumn(col, i, contentHeight, colWidth)
		columns = append(columns, columnContent)
	}

	// Right scroll indicator space if in narrow mode and not at end
	if m.narrowMode && endCol < len(m.board.Columns) {
		indicatorWidth := 5
		// Empty space for right indicator alignment with header
		columns = append(columns, lipgloss.NewStyle().
			Width(indicatorWidth).
			Height(contentHeight).
			Render(""))
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

	// Get scroll offset from model if this is the selected column
	var startIndex int
	if colIndex == m.selectedColumn && m.columnScrollOffset != nil {
		startIndex = m.columnScrollOffset[colIndex]
	} else {
		// Default: show last tasks (newest at bottom)
		startIndex = len(col.Tasks) - tasksToShow
		if startIndex < 0 {
			startIndex = 0
		}
	}

	// Clamp startIndex
	if startIndex < 0 {
		startIndex = 0
	}
	maxStart := len(col.Tasks) - tasksToShow
	if maxStart < 0 {
		maxStart = 0
	}
	if startIndex > maxStart {
		startIndex = maxStart
	}

	// Calculate end index for the visible range
	endIndex := startIndex + tasksToShow
	if endIndex > len(col.Tasks) {
		endIndex = len(col.Tasks)
	}

	// Show scroll indicator if there are hidden tasks above
	if startIndex > 0 {
		hiddenAbove := fmt.Sprintf("↑ %d more", startIndex)
		columnContent.WriteString(styleSubdued.Render(hiddenAbove) + "\n")
	}

	for i := startIndex; i < endIndex; i++ {
		// Show drop indicator before this task if needed
		if showDropIndicator && m.dropTargetIndex == i {
			dropLine := strings.Repeat("-", cardWidth)
			columnContent.WriteString(styleDropIndicator.Render(dropLine) + "\n")
		}

		task := col.Tasks[i]
		isLastVisible := i == endIndex-1
		isSelected := colIndex == m.selectedColumn && i == m.selectedTask

		// Check if this is the task being dragged
		isDragging := m.draggingTask != nil && m.dragFromColumn == colIndex && i == m.dragFromIndex

		// Check if task matches filter (show as ghost if it doesn't match)
		matchesFilter := m.taskMatchesFilter(task)

		if isLastVisible {
			// Last visible task - show full card
			if isDragging || !matchesFilter {
				columnContent.WriteString(renderCardGhost(task))
			} else {
				columnContent.WriteString(renderCard(task, isSelected))
			}
		} else {
			// Stacked task - show only top 2 lines
			if isDragging || !matchesFilter {
				columnContent.WriteString(renderCardTopLinesGhost(task))
			} else {
				columnContent.WriteString(renderCardTopLines(task, isSelected))
			}
			columnContent.WriteString("\n")
		}
	}

	// Show drop indicator at end if needed
	if showDropIndicator && m.dropTargetIndex == len(col.Tasks) {
		dropLine := strings.Repeat("-", cardWidth)
		columnContent.WriteString("\n" + styleDropIndicator.Render(dropLine))
	}

	// Show scroll indicator if there are hidden tasks below
	if endIndex < len(col.Tasks) {
		hiddenBelow := fmt.Sprintf("↓ %d more", len(col.Tasks)-endIndex)
		columnContent.WriteString("\n" + styleSubdued.Render(hiddenBelow))
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
	panelWidth := m.detailWidth - 2
	contentWidth := panelWidth - 6 // Account for borders and padding

	var content strings.Builder

	if task == nil {
		content.WriteString(styleSubdued.Render("No task selected"))
	} else {
		// Use cached details if available (fetched in Update when selection changes)
		details := m.cachedIssueDetails
		if details != nil && m.cachedIssueID != task.ID {
			details = nil // Stale cache
		}

		// Title (wrapped)
		wrappedTitle := wrapText(task.Title, contentWidth)
		content.WriteString(styleDetailTitle.Render(wrappedTitle))
		content.WriteString("\n\n")

		// Issue ID
		content.WriteString(styleDetailLabel.Render("ID: "))
		content.WriteString(styleSubdued.Render(task.ID))
		content.WriteString("\n\n")

		// Status and Priority on same line
		content.WriteString(styleDetailLabel.Render("Priority: "))
		content.WriteString(renderPriorityBadge(task.Priority))
		content.WriteString(" " + task.Priority.String())
		content.WriteString("\n\n")

		// Labels/Type
		if len(task.Labels) > 0 {
			content.WriteString(styleDetailLabel.Render("Type: "))
			for _, label := range task.Labels {
				content.WriteString(styleLabel.Render(label))
			}
			content.WriteString("\n\n")
		}

		// Description (with word wrapping)
		if task.Description != "" {
			content.WriteString(styleDetailLabel.Render("Description:"))
			content.WriteString("\n")
			wrappedDesc := wrapText(task.Description, contentWidth)
			content.WriteString(styleDetailValue.Render(wrappedDesc))
			content.WriteString("\n\n")
		}

		// Dependencies section (from bd show details)
		if details != nil && len(details.Dependencies) > 0 {
			content.WriteString(styleDetailLabel.Render("⛔ Blocked By:"))
			content.WriteString("\n")
			for _, dep := range details.Dependencies {
				statusIcon := "○"
				if dep.Status == "closed" {
					statusIcon = "✓"
				} else if dep.Status == "in_progress" {
					statusIcon = "◐"
				}
				depLine := fmt.Sprintf("  %s %s", statusIcon, dep.ID)
				content.WriteString(styleSubdued.Render(depLine))
				content.WriteString("\n")
				titleLine := fmt.Sprintf("    %s", truncateText(dep.Title, contentWidth-4))
				content.WriteString(styleDetailValue.Render(titleLine))
				content.WriteString("\n")
			}
			content.WriteString("\n")
		} else if len(task.BlockedBy) > 0 {
			// Fallback to basic blocked by list
			content.WriteString(styleDetailLabel.Render("⛔ Blocked By: "))
			content.WriteString(strings.Join(task.BlockedBy, ", "))
			content.WriteString("\n\n")
		}

		// Dependents section (issues this blocks)
		if details != nil && len(details.Dependents) > 0 {
			content.WriteString(styleDetailLabel.Render("🚫 Blocking:"))
			content.WriteString("\n")
			for _, dep := range details.Dependents {
				statusIcon := "○"
				if dep.Status == "closed" {
					statusIcon = "✓"
				} else if dep.Status == "in_progress" {
					statusIcon = "◐"
				}
				depLine := fmt.Sprintf("  %s %s", statusIcon, dep.ID)
				content.WriteString(styleSubdued.Render(depLine))
				content.WriteString("\n")
				titleLine := fmt.Sprintf("    %s", truncateText(dep.Title, contentWidth-4))
				content.WriteString(styleDetailValue.Render(titleLine))
				content.WriteString("\n")
			}
			content.WriteString("\n")
		} else if len(task.Blocking) > 0 {
			// Fallback to basic blocking list
			content.WriteString(styleDetailLabel.Render("🚫 Blocking: "))
			content.WriteString(strings.Join(task.Blocking, ", "))
			content.WriteString("\n\n")
		}

		// Agent info
		if task.Agent != nil {
			content.WriteString(styleDetailLabel.Render("Agent: "))
			content.WriteString(renderAgentBadge(task.Agent))
			content.WriteString(" " + string(task.Agent.Type))
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
			content.WriteString("\n")
		}

		// Timestamps
		content.WriteString(styleDivider.Render(strings.Repeat("─", contentWidth)))
		content.WriteString("\n")
		if details != nil {
			content.WriteString(styleSubdued.Render(fmt.Sprintf("Created: %s by %s",
				formatRelativeTime(details.CreatedAt), details.CreatedBy)))
			content.WriteString("\n")
			content.WriteString(styleSubdued.Render(fmt.Sprintf("Updated: %s",
				formatRelativeTime(details.UpdatedAt))))
			if !details.ClosedAt.IsZero() {
				content.WriteString("\n")
				content.WriteString(styleSubdued.Render(fmt.Sprintf("Closed:  %s",
					formatRelativeTime(details.ClosedAt))))
			}
		} else {
			content.WriteString(styleSubdued.Render(fmt.Sprintf("Created: %s",
				formatRelativeTime(task.CreatedAt))))
			content.WriteString("\n")
			content.WriteString(styleSubdued.Render(fmt.Sprintf("Updated: %s",
				formatRelativeTime(task.UpdatedAt))))
		}
	}

	return styleDetailPanel.
		Width(panelWidth).
		Height(m.getContentHeight()).
		Render(content.String())
}

// wrapText wraps text to fit within maxWidth characters
func wrapText(text string, maxWidth int) string {
	if maxWidth <= 0 {
		maxWidth = 40
	}

	var result strings.Builder
	words := strings.Fields(text)
	lineLen := 0

	for _, word := range words {
		wordLen := len(word)

		if lineLen+wordLen+1 > maxWidth && lineLen > 0 {
			result.WriteString("\n")
			lineLen = 0
		}

		if lineLen > 0 {
			result.WriteString(" ")
			lineLen++
		}

		// Handle words longer than maxWidth
		if wordLen > maxWidth {
			for len(word) > maxWidth {
				if lineLen > 0 {
					result.WriteString("\n")
					lineLen = 0
				}
				result.WriteString(word[:maxWidth-1])
				result.WriteString("-")
				word = word[maxWidth-1:]
				result.WriteString("\n")
			}
			if len(word) > 0 {
				result.WriteString(word)
				lineLen = len(word)
			}
		} else {
			result.WriteString(word)
			lineLen += wordLen
		}
	}

	return result.String()
}

// truncateText truncates text to maxLen with ellipsis
func truncateText(text string, maxLen int) string {
	if len(text) <= maxLen {
		return text
	}
	if maxLen <= 3 {
		return text[:maxLen]
	}
	return text[:maxLen-1] + "…"
}

// formatRelativeTime formats a time as relative (e.g., "2 hours ago")
func formatRelativeTime(t time.Time) string {
	if t.IsZero() {
		return "unknown"
	}

	now := time.Now()
	diff := now.Sub(t)

	switch {
	case diff < time.Minute:
		return "just now"
	case diff < time.Hour:
		mins := int(diff.Minutes())
		if mins == 1 {
			return "1 minute ago"
		}
		return fmt.Sprintf("%d minutes ago", mins)
	case diff < 24*time.Hour:
		hours := int(diff.Hours())
		if hours == 1 {
			return "1 hour ago"
		}
		return fmt.Sprintf("%d hours ago", hours)
	case diff < 7*24*time.Hour:
		days := int(diff.Hours() / 24)
		if days == 1 {
			return "yesterday"
		}
		return fmt.Sprintf("%d days ago", days)
	default:
		return t.Format("Jan 2, 2006")
	}
}

// renderStatus renders the status bar
func (m Model) renderStatus() string {
	// If filter input is active, show the filter input
	if m.filterActive {
		filterLabel := styleDetailLabel.Render("Filter: ")
		filterInput := m.filterInput.View()
		hint := styleSubdued.Render(" (Enter to apply, Esc to cancel)")
		return styleStatus.Width(m.width).Render(filterLabel + filterInput + hint)
	}

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

	// Show filter indicator if filter is set
	var filterInfo string
	if m.filterText != "" {
		filterInfo = fmt.Sprintf(" | Filter: %s", m.filterText)
	}

	// Show narrow mode indicator with column position
	var narrowInfo string
	if m.narrowMode {
		endCol := m.visibleColumnStart + m.visibleColumnCount
		if endCol > len(m.board.Columns) {
			endCol = len(m.board.Columns)
		}
		narrowInfo = fmt.Sprintf(" [%d-%d/%d]", m.visibleColumnStart+1, endCol, len(m.board.Columns))
	}

	// Show chat hint if task is selected
	var chatHint string
	if task != nil {
		chatHint = " | c Chat"
	}

	// Show backend indicator
	backendHint := " [YAML]"
	if m.isBeadsBackend() {
		if m.isShowingAll() {
			backendHint = " [beads:all]"
		} else {
			backendHint = " [beads]"
		}
	}

	status := fmt.Sprintf("%s | Column: %s%s%s%s%s | ? Help | B Backend | q Quit", backendHint, colName, narrowInfo, taskInfo, filterInfo, chatHint)

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
		title = "Quick Add"
	} else {
		title = "Edit Task"
	}

	var formContent strings.Builder
	formContent.WriteString(styleDetailTitle.Render(title))
	formContent.WriteString("\n\n")

	// Title input
	formContent.WriteString(styleDetailLabel.Render("Title:"))
	formContent.WriteString("\n")
	formContent.WriteString(m.formInputs[0].View())
	formContent.WriteString("\n\n")

	// Type selector row
	formContent.WriteString(styleDetailLabel.Render("Type:"))
	formContent.WriteString("  ")
	types := []string{"task", "bug", "feature"}
	for i, t := range types {
		if t == m.formIssueType {
			formContent.WriteString(styleFormSelected.Render(t))
		} else {
			formContent.WriteString(styleFormOption.Render(t))
		}
		if i < len(types)-1 {
			formContent.WriteString("  ")
		}
	}
	formContent.WriteString("\n\n")

	// Priority selector row
	formContent.WriteString(styleDetailLabel.Render("Priority:"))
	formContent.WriteString("  ")
	priorities := []Priority{PriorityUrgent, PriorityHigh, PriorityMedium, PriorityLow}
	labels := []string{"P0", "P1", "P2", "P3"}
	for i, p := range priorities {
		if p == m.formPriority {
			formContent.WriteString(m.renderPriorityBadgeSelected(p, labels[i]))
		} else {
			formContent.WriteString(m.renderPriorityBadgeDim(labels[i]))
		}
		if i < len(priorities)-1 {
			formContent.WriteString(" ")
		}
	}
	formContent.WriteString("\n\n")

	// Description input
	formContent.WriteString(styleDetailLabel.Render("Description:"))
	formContent.WriteString(" ")
	formContent.WriteString(styleSubdued.Render("(optional)"))
	formContent.WriteString("\n")
	formContent.WriteString(m.formInputs[1].View())
	formContent.WriteString("\n\n")

	// Help text
	formContent.WriteString(styleSubdued.Render("Ctrl+T: Type | Ctrl+P: Priority | Ctrl+S: Save | Esc: Cancel"))

	overlay := lipgloss.NewStyle().
		Border(lipgloss.RoundedBorder()).
		BorderForeground(colorPrimary).
		Padding(1, 2).
		Width(56).
		Render(formContent.String())

	return lipgloss.Place(m.width, m.height, lipgloss.Center, lipgloss.Center, overlay)
}

// renderPriorityBadgeSelected renders a priority badge with full styling (selected)
func (m Model) renderPriorityBadgeSelected(p Priority, label string) string {
	var color lipgloss.Color
	switch p {
	case PriorityUrgent:
		color = colorDanger
	case PriorityHigh:
		color = colorWarning
	case PriorityMedium:
		color = colorInfo
	case PriorityLow:
		color = colorSuccess
	}
	return lipgloss.NewStyle().
		Background(color).
		Foreground(lipgloss.Color("0")).
		Bold(true).
		Padding(0, 1).
		Render(label)
}

// renderPriorityBadgeDim renders a priority badge with dim styling (not selected)
func (m Model) renderPriorityBadgeDim(label string) string {
	return styleFormOption.Render(label)
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
  Enter or e          Open/edit selected task
  n                   Quick-add new task
  d                   Delete selected task
  m                   Move task to next column
  M                   Move task to previous column
  c                   Chat with Claude about task (tmux popup)
  Mouse drag          Drag & drop tasks between columns
  Click column header Jump to that column

QUICK-ADD FORM
  Alt+T               Cycle issue type (task/bug/feature)
  [ / ]               Cycle priority down/up (P0-P3)
  Ctrl+S              Save and close form
  Esc                 Cancel and close form

VIEW
  Tab                 Toggle detail panel
  /                   Filter tasks
  Esc                 Clear filter
  A                   Toggle show all (include closed)
  B                   Toggle beads/local backend
  ?                   Toggle this help screen

RESPONSIVE LAYOUT
  Narrow terminals show fewer columns at once.
  Use h/l to scroll through columns automatically.
  Status bar shows [visible/total] column range.

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

// taskMatchesFilter checks if a task matches the current filter text
func (m Model) taskMatchesFilter(task *Task) bool {
	if m.filterText == "" {
		return true
	}

	filter := strings.ToLower(m.filterText)
	title := strings.ToLower(task.Title)
	desc := strings.ToLower(task.Description)

	// Match against title or description
	return strings.Contains(title, filter) || strings.Contains(desc, filter)
}

// getFilteredTasks returns tasks that match the current filter
func (m Model) getFilteredTasks(col Column) []*Task {
	if m.filterText == "" {
		return col.Tasks
	}

	var filtered []*Task
	for _, task := range col.Tasks {
		if m.taskMatchesFilter(task) {
			filtered = append(filtered, task)
		}
	}
	return filtered
}
