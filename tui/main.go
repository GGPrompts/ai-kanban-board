package main

import (
	"flag"
	"fmt"
	"os"

	tea "github.com/charmbracelet/bubbletea"
)

func main() {
	// Parse command-line flags
	var (
		boardFile = flag.String("board", "board.yaml", "Path to board YAML/JSON file")
		beadsMode = flag.Bool("beads", false, "Use beads issue tracker as backend")
		help      = flag.Bool("help", false, "Show help")
	)
	flag.Parse()

	if *help {
		fmt.Println("AI Kanban Board TUI")
		fmt.Println()
		fmt.Println("Usage:")
		fmt.Println("  ai-kanban-tui                    # Use default board.yaml")
		fmt.Println("  ai-kanban-tui --board=tasks.yaml # Use custom board file")
		fmt.Println("  ai-kanban-tui --beads            # Use beads issue tracker")
		fmt.Println()
		fmt.Println("Keyboard shortcuts:")
		fmt.Println("  arrows / hjkl  Navigate columns and tasks")
		fmt.Println("  Enter / e      Open/edit selected task")
		fmt.Println("  n              Create new task")
		fmt.Println("  d              Delete selected task")
		fmt.Println("  m / M          Move task to next/prev column")
		fmt.Println("  /              Filter tasks")
		fmt.Println("  Esc            Clear filter")
		fmt.Println("  Tab            Toggle detail panel")
		fmt.Println("  ?              Show help")
		fmt.Println("  q              Quit")
		os.Exit(0)
	}

	// Create backend and load board
	var backend Backend
	if *beadsMode {
		backend = NewBeadsBackend()
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
