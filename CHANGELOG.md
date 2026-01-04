# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

#### Terminal UI - Wave 5a
- **Responsive Column Layout** - Narrow terminals (under 120 chars) show fewer columns with scroll indicators, auto-scrolls to follow navigation, reduced min width to 40 chars
- **Enhanced Detail Panel** - Full issue information from `bd show` integration including description, dependencies, dependents, and timestamps
- **Quick-Add Modal** - Keyboard shortcuts for rapid issue creation: Ctrl+T cycles type (task/bug/feature), Ctrl+P cycles priority (P0-P3)

#### Agent Management (Epic Complete)
- **Agent Panel** - Grid/list view for managing custom agent profiles with drag reorder, search, and quick actions (duplicate, delete, export)
- **Agent Editor Dialog** - Tabbed interface for creating/editing agents with General, Skills, MCP, Subagents, and CLI configuration
- **Agent Card** - Profile display component showing agent avatar, type, and capabilities
- **Capability Toggles** - Per-task toggle controls for agent skills, MCP servers, subagents, and permission flags before execution

#### Terminal UI
- **Keyboard Navigation** - Arrow keys, vim bindings (h/j/k/l), Enter to open tasks, Tab to cycle columns
- **Task Filtering** - Press `/` to filter tasks, Esc to clear, non-matching tasks appear dimmed
- **Mouse Drag-and-Drop** - Drag tasks between columns with visual feedback
- **Priority/Agent Badges** - Visual indicators on task cards
- **Scrollable Columns** - Enhanced layout with scroll support for long task lists
- **Beads Integration** - Backend support for bd CLI issue tracking

### Changed
- CLAUDE.md updated with parallel worker patterns and beads workflow documentation
