package main

import (
	"fmt"
	"os/exec"
	"strings"
)

// tmux.go - Tmux Integration for floating chat popup
// Launches Claude in a tmux popup with card context

// isInsideTmux checks if the program is running inside a tmux session
func isInsideTmux() bool {
	return exec.Command("sh", "-c", "[ -n \"$TMUX\" ]").Run() == nil
}

// launchChatPopup launches Claude in a tmux popup with task context
// Returns error if not in tmux or if popup fails
func launchChatPopup(task *Task, issueDetails *BeadsIssueDetails) error {
	if !isInsideTmux() {
		return fmt.Errorf("not running inside tmux - popup requires tmux")
	}

	if task == nil {
		return fmt.Errorf("no task selected")
	}

	// Build context string for Claude
	var contextParts []string

	// Add issue ID if it looks like a beads ID
	if strings.HasPrefix(task.ID, "ai-kanban-board-") {
		contextParts = append(contextParts, fmt.Sprintf("Issue: %s", task.ID))
	}

	// Add title
	contextParts = append(contextParts, fmt.Sprintf("Title: %s", task.Title))

	// Add description if present
	if task.Description != "" {
		contextParts = append(contextParts, fmt.Sprintf("Description: %s", task.Description))
	}

	// Add priority
	contextParts = append(contextParts, fmt.Sprintf("Priority: %s", task.Priority.String()))

	// Add labels/type
	if len(task.Labels) > 0 {
		contextParts = append(contextParts, fmt.Sprintf("Type: %s", task.Labels[0]))
	}

	// Add dependencies if from beads
	if issueDetails != nil {
		if len(issueDetails.Dependencies) > 0 {
			var depIDs []string
			for _, dep := range issueDetails.Dependencies {
				depIDs = append(depIDs, dep.ID)
			}
			contextParts = append(contextParts, fmt.Sprintf("Blocked by: %s", strings.Join(depIDs, ", ")))
		}
		if len(issueDetails.Dependents) > 0 {
			var depIDs []string
			for _, dep := range issueDetails.Dependents {
				depIDs = append(depIDs, dep.ID)
			}
			contextParts = append(contextParts, fmt.Sprintf("Blocks: %s", strings.Join(depIDs, ", ")))
		}
	}

	context := strings.Join(contextParts, "\n")

	// Build the initial prompt for Claude
	prompt := fmt.Sprintf("I'm working on this task from my kanban board:\n\n%s\n\nHelp me with this task.", context)

	// Escape the prompt for shell (replace single quotes)
	escapedPrompt := strings.ReplaceAll(prompt, "'", "'\"'\"'")

	// Build the claude command with the prompt
	// Use -p to pass an initial prompt to Claude
	claudeCmd := fmt.Sprintf("claude -p '%s'", escapedPrompt)

	// Launch Claude in a tmux popup
	// -E: close popup when command exits
	// -w 80%%: 80% width
	// -h 80%%: 80% height
	// -d: start in current pane's directory
	cmd := exec.Command("tmux", "display-popup",
		"-E",
		"-w", "80%",
		"-h", "80%",
		"-d", "#{pane_current_path}",
		"sh", "-c", claudeCmd,
	)

	return cmd.Run()
}

// launchChatPopupSimple launches Claude with just task context (no beads details)
func launchChatPopupSimple(task *Task) error {
	return launchChatPopup(task, nil)
}
