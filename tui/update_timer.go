package main

import (
	"time"

	tea "github.com/charmbracelet/bubbletea"
)

// dragDelayDuration is how long to wait before starting a drag
const dragDelayDuration = 150 * time.Millisecond

// dragStartMsg signals that the drag delay has expired
type dragStartMsg struct{}

// tickCmd creates a command that sends a message after the drag delay
func tickCmd() tea.Cmd {
	return tea.Tick(dragDelayDuration, func(t time.Time) tea.Msg {
		return dragStartMsg{}
	})
}
