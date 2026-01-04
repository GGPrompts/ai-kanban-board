package main

import (
	"flag"
	"fmt"
	"os"
	"path/filepath"

	tea "github.com/charmbracelet/bubbletea"
)

// beadsProjectDetected checks if .beads/ exists in current directory
func beadsProjectDetected() bool {
	cwd, err := os.Getwd()
	if err != nil {
		return false
	}
	beadsDir := filepath.Join(cwd, ".beads")
	info, err := os.Stat(beadsDir)
	return err == nil && info.IsDir()
}

func main() {
	// Parse command-line flags
	var (
		boardFile = flag.String("board", "board.yaml", "Path to board YAML/JSON file")
		beadsMode = flag.Bool("beads", false, "Use beads issue tracker as backend")
		noBeads   = flag.Bool("no-beads", false, "Force local YAML backend (disable auto-detect)")
		help      = flag.Bool("help", false, "Show help")
	)
	flag.Parse()

	if *help {
		fmt.Println("AI Kanban Board TUI")
		fmt.Println()
		fmt.Println("Usage:")
		fmt.Println("  ai-kanban-tui                    # Auto-detect beads or use board.yaml")
		fmt.Println("  ai-kanban-tui --board=tasks.yaml # Use custom board file")
		fmt.Println("  ai-kanban-tui --beads            # Force beads backend")
		fmt.Println("  ai-kanban-tui --no-beads         # Force local YAML backend")
		fmt.Println()
		fmt.Println("Keyboard shortcuts:")
		fmt.Println("  arrows / hjkl  Navigate columns and tasks")
		fmt.Println("  Enter / e      Open/edit selected task")
		fmt.Println("  n              Create new task")
		fmt.Println("  d              Delete selected task")
		fmt.Println("  m / M          Move task to next/prev column")
		fmt.Println("  c              Chat with Claude (tmux popup)")
		fmt.Println("  B              Toggle beads/local backend")
		fmt.Println("  /              Filter tasks")
		fmt.Println("  Esc            Clear filter")
		fmt.Println("  Tab            Toggle detail panel")
		fmt.Println("  ?              Show help")
		fmt.Println("  q              Quit")
		os.Exit(0)
	}

	// Determine backend: explicit flag > auto-detect > local
	var backend Backend
	useBeads := *beadsMode || (!*noBeads && beadsProjectDetected())
	if useBeads {
		backend = NewBeadsBackend()
		fmt.Println("Using beads backend (detected .beads/ directory)")
	} else {
		backend = NewLocalBackend(*boardFile)
	}

	board, err := backend.LoadBoard()
	if err != nil {
		fmt.Printf("Error loading board: %v\n", err)
		os.Exit(1)
	}

	// Initialize model with backend
	m := NewModelWithBackend(board, backend)

	// Create Bubbletea program
	p := tea.NewProgram(
		m,
		tea.WithAltScreen(),
		tea.WithMouseCellMotion(),
	)

	// Run the program
	if _, err := p.Run(); err != nil {
		fmt.Printf("Error running program: %v\n", err)
		os.Exit(1)
	}
}
