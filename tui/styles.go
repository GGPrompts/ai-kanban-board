package main

import (
	"strings"

	"github.com/charmbracelet/lipgloss"
)

// Tailwind to Terminal Color Mapping
// Maps Tailwind CSS color classes to terminal 256-color codes
var tailwindToTerminal = map[string]lipgloss.Color{
	// Primary colors from ai-kanban-board
	"border-t-emerald-500": lipgloss.Color("76"),  // Emerald/Green
	"border-t-cyan-500":    lipgloss.Color("117"), // Cyan
	"border-t-blue-500":    lipgloss.Color("75"),  // Blue
	"border-t-purple-500":  lipgloss.Color("140"), // Purple
	"border-t-pink-500":    lipgloss.Color("212"), // Pink
	"border-t-red-500":     lipgloss.Color("203"), // Red
	"border-t-orange-500":  lipgloss.Color("208"), // Orange
	"border-t-yellow-500":  lipgloss.Color("220"), // Yellow
	"border-t-green-500":   lipgloss.Color("76"),  // Green
	"border-t-teal-500":    lipgloss.Color("37"),  // Teal
	"border-t-indigo-500":  lipgloss.Color("62"),  // Indigo
	"border-t-slate-500":   lipgloss.Color("243"), // Slate/Gray
	"border-t-amber-500":   lipgloss.Color("214"), // Amber
	"border-t-violet-500":  lipgloss.Color("141"), // Violet
}

// GetTerminalColor converts a Tailwind color class to terminal color
func GetTerminalColor(tailwindClass string) lipgloss.Color {
	if color, ok := tailwindToTerminal[tailwindClass]; ok {
		return color
	}
	// Default to slate gray if not found
	return lipgloss.Color("243")
}

// Color palette - professional terminal colors
var (
	// Base colors
	colorBackground = lipgloss.Color("235") // Dark gray
	colorForeground = lipgloss.Color("252") // Light gray
	colorBorder     = lipgloss.Color("240") // Medium gray
	colorDivider    = lipgloss.Color("237") // Slightly lighter than background

	// Accent colors (matching ai-kanban-board theme)
	colorPrimary   = lipgloss.Color("76")  // Emerald - primary accent
	colorSecondary = lipgloss.Color("117") // Cyan - secondary accent
	colorSuccess   = lipgloss.Color("76")  // Green
	colorWarning   = lipgloss.Color("220") // Yellow
	colorDanger    = lipgloss.Color("203") // Red
	colorInfo      = lipgloss.Color("117") // Cyan

	// UI element colors
	colorTitle     = lipgloss.Color("76")  // Emerald for terminal glow effect
	colorSelected  = lipgloss.Color("212") // Pink/magenta
	colorSubdued   = lipgloss.Color("243") // Subdued gray
	colorHighlight = lipgloss.Color("229") // Bright yellow

	// Priority colors
	colorPriorityLow    = lipgloss.Color("243") // Slate
	colorPriorityMedium = lipgloss.Color("75")  // Blue
	colorPriorityHigh   = lipgloss.Color("208") // Orange
	colorPriorityUrgent = lipgloss.Color("203") // Red

	// Agent status colors
	colorAgentIdle      = lipgloss.Color("243") // Gray
	colorAgentRunning   = lipgloss.Color("76")  // Emerald
	colorAgentPaused    = lipgloss.Color("214") // Amber
	colorAgentCompleted = lipgloss.Color("76")  // Green
	colorAgentFailed    = lipgloss.Color("203") // Red
)

// GetPriorityColor returns the terminal color for a priority level
func GetPriorityColor(p Priority) lipgloss.Color {
	switch p {
	case PriorityLow:
		return colorPriorityLow
	case PriorityMedium:
		return colorPriorityMedium
	case PriorityHigh:
		return colorPriorityHigh
	case PriorityUrgent:
		return colorPriorityUrgent
	}
	return colorPriorityMedium
}

// GetAgentStatusColor returns the terminal color for an agent status
func GetAgentStatusColor(s AgentStatus) lipgloss.Color {
	switch s {
	case AgentIdle:
		return colorAgentIdle
	case AgentRunning:
		return colorAgentRunning
	case AgentPaused:
		return colorAgentPaused
	case AgentCompleted:
		return colorAgentCompleted
	case AgentFailed:
		return colorAgentFailed
	}
	return colorAgentIdle
}

// Base styles
var (
	// Title bar style (with terminal glow effect)
	styleTitle = lipgloss.NewStyle().
			Foreground(colorTitle).
			Bold(true).
			Padding(0, 1)

	// Status bar style
	styleStatus = lipgloss.NewStyle().
			Foreground(colorSubdued).
			Padding(0, 1)

	// Subdued text style (for secondary info)
	styleSubdued = lipgloss.NewStyle().
			Foreground(colorSubdued)

	// Panel border style
	stylePanelBorder = lipgloss.NewStyle().
				Border(lipgloss.RoundedBorder()).
				BorderForeground(colorBorder).
				Padding(0, 1)

	// Divider style (vertical line between panels)
	styleDivider = lipgloss.NewStyle().
			Foreground(colorDivider)
)

// Column styles
var (
	// Column header style (centered, bold)
	styleColumnHeader = lipgloss.NewStyle().
				Foreground(colorPrimary).
				Bold(true).
				Align(lipgloss.Center)

	// Selected column header style
	styleColumnHeaderSelected = lipgloss.NewStyle().
					Foreground(colorSelected).
					Bold(true).
					Align(lipgloss.Center)
)

// Card/Task styles (12 chars wide x 5 lines tall - Solitaire-style)
var (
	cardWidth  = 14
	cardHeight = 5

	// Normal card style
	styleCard = lipgloss.NewStyle().
			Width(cardWidth).
			Height(cardHeight).
			Border(lipgloss.RoundedBorder()).
			BorderForeground(colorBorder).
			Padding(0, 1)

	// Selected card style
	styleCardSelected = lipgloss.NewStyle().
				Width(cardWidth).
				Height(cardHeight).
				Border(lipgloss.RoundedBorder()).
				BorderForeground(colorSelected).
				Foreground(colorSelected).
				Bold(true).
				Padding(0, 1)

	// Drop indicator style (thin line showing where task will be dropped)
	styleDropIndicator = lipgloss.NewStyle().
				Foreground(colorSuccess).
				Bold(true)

	// Ghost card style (for card being dragged)
	styleCardGhost = lipgloss.NewStyle().
			Width(cardWidth).
			Height(cardHeight).
			Border(lipgloss.RoundedBorder()).
			BorderForeground(colorSubdued).
			Foreground(colorSubdued).
			Padding(0, 1)

	// Card content style (for text inside cards)
	styleCardContent = lipgloss.NewStyle().
				Width(cardWidth - 2). // Account for padding
				Foreground(colorForeground)
)

// Detail panel styles
var (
	styleDetailPanel = lipgloss.NewStyle().
				Border(lipgloss.RoundedBorder()).
				BorderForeground(colorBorder).
				Padding(1, 2)

	styleDetailTitle = lipgloss.NewStyle().
				Foreground(colorTitle).
				Bold(true).
				Underline(true)

	styleDetailLabel = lipgloss.NewStyle().
				Foreground(colorSubdued).
				Bold(true)

	styleDetailValue = lipgloss.NewStyle().
				Foreground(colorForeground)

	styleLabel = lipgloss.NewStyle().
			Foreground(colorInfo).
			Background(lipgloss.Color("238")).
			Padding(0, 1).
			MarginRight(1)

	stylePriorityBadge = lipgloss.NewStyle().
				Padding(0, 1)

	styleAgentBadge = lipgloss.NewStyle().
			Padding(0, 1)
)

// Helper functions for styling

// renderCard renders a card with the given title (wrapped, no labels)
func renderCard(title string, selected bool) string {
	return renderCardWithStyle(title, selected, false)
}

// renderCardGhost renders a faded ghost card (for dragging)
func renderCardGhost(title string) string {
	return renderCardWithStyle(title, false, true)
}

// renderCardWithStyle renders a card with the given title and style options
func renderCardWithStyle(title string, selected bool, ghost bool) string {
	style := styleCard
	if ghost {
		style = styleCardGhost
	} else if selected {
		style = styleCardSelected
	}

	// Wrap title to fit card width (12 chars with padding)
	maxWidth := cardWidth - 2
	wrappedTitle := wrapCardTitle(title, maxWidth)

	return style.Render(wrappedTitle)
}

// renderCardTopLines renders just the top 2 lines of a card (for stacking)
// This creates the Solitaire-style cascading effect
func renderCardTopLines(title string, selected bool) string {
	// Render full card first
	fullCard := renderCardWithStyle(title, selected, false)

	// Extract just the top 2 lines
	lines := strings.Split(fullCard, "\n")
	if len(lines) >= 2 {
		return lines[0] + "\n" + lines[1]
	}
	return fullCard
}

// renderCardTopLinesGhost renders just the top 2 lines of a ghost card
func renderCardTopLinesGhost(title string) string {
	// Render full ghost card first
	fullCard := renderCardGhost(title)

	// Extract just the top 2 lines
	lines := strings.Split(fullCard, "\n")
	if len(lines) >= 2 {
		return lines[0] + "\n" + lines[1]
	}
	return fullCard
}

// wrapCardTitle wraps a title to fit within the card width
func wrapCardTitle(title string, maxWidth int) string {
	if len(title) <= maxWidth {
		return title
	}

	var lines []string
	words := strings.Fields(title)
	currentLine := ""

	for _, word := range words {
		// If word itself is too long, split it
		if len(word) > maxWidth {
			if currentLine != "" {
				lines = append(lines, currentLine)
				currentLine = ""
			}
			// Split long word across multiple lines
			for len(word) > maxWidth {
				lines = append(lines, word[:maxWidth])
				word = word[maxWidth:]
			}
			currentLine = word
			continue
		}

		// Try adding word to current line
		testLine := currentLine
		if currentLine != "" {
			testLine += " "
		}
		testLine += word

		if len(testLine) <= maxWidth {
			currentLine = testLine
		} else {
			// Word doesn't fit, start new line
			if currentLine != "" {
				lines = append(lines, currentLine)
			}
			currentLine = word
		}
	}

	if currentLine != "" {
		lines = append(lines, currentLine)
	}

	// Limit to 3 lines (card has 5 total, 2 for border)
	if len(lines) > 3 {
		lines = lines[:3]
		// Add ellipsis to last line if truncated
		lastLine := lines[2]
		if len(lastLine) > maxWidth-1 {
			lines[2] = lastLine[:maxWidth-1] + "..."
		} else {
			lines[2] = lastLine + "..."
		}
	}

	return strings.Join(lines, "\n")
}

// renderPriorityBadge renders a priority indicator
func renderPriorityBadge(p Priority) string {
	color := GetPriorityColor(p)
	style := stylePriorityBadge.Foreground(color)

	switch p {
	case PriorityUrgent:
		return style.Render("!!!")
	case PriorityHigh:
		return style.Render("!!")
	case PriorityMedium:
		return style.Render("!")
	case PriorityLow:
		return style.Render("-")
	}
	return ""
}

// renderAgentBadge renders an agent status indicator
func renderAgentBadge(agent *AgentInfo) string {
	if agent == nil {
		return ""
	}

	color := GetAgentStatusColor(agent.Status)
	style := styleAgentBadge.Foreground(color)

	var icon string
	switch agent.Status {
	case AgentRunning:
		icon = ">"
	case AgentPaused:
		icon = "||"
	case AgentCompleted:
		icon = "OK"
	case AgentFailed:
		icon = "X"
	default:
		icon = "o"
	}

	return style.Render(icon)
}
