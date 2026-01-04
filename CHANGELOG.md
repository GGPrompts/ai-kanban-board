# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

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
