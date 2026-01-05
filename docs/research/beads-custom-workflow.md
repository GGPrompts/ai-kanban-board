# Research: Custom Workflow Steps in Beads

**Issue:** ai-kanban-board-ecy
**Date:** 2026-01-04
**Goal:** Determine if we can sync kanban columns bidirectionally with beads workflow steps

---

## Summary

**Yes, beads supports custom workflow statuses.** Bidirectional sync with kanban columns is feasible.

---

## Key Findings

### 1. Built-in Statuses

Beads has 5 built-in statuses:

| Status | Description |
|--------|-------------|
| `open` | Default for new issues |
| `in_progress` | Being worked on |
| `blocked` | Waiting on dependencies |
| `deferred` | Postponed for later |
| `closed` | Completed |

### 2. Custom Status Support

Custom statuses are configured via `bd config`:

```bash
# Set custom statuses (comma-separated)
bd config set status.custom "awaiting_review,awaiting_testing,awaiting_merge"

# Query current configuration
bd config get status.custom

# Remove custom statuses
bd config unset status.custom
```

**Behavior:**
- Works with `bd update --status=<custom_status>`
- Can filter with `bd list --status=<custom_status>`
- No validation - any status string is accepted
- Stored in beads database (not config.yaml)

### 3. Status Transitions

**No transition rules are enforced.** Any status can transition to any other status.

| Command | Effect |
|---------|--------|
| `bd update --status=X` | Sets status directly to X |
| `bd close <id>` | Sets status to "closed" + sets closed_at timestamp |
| `bd reopen <id>` | Sets status to "open" + clears closed_at |
| `bd defer <id>` | Sets status to "deferred" |

### 4. Multi-Dimensional State (Labels)

Separate from issue status, beads supports multi-dimensional state via labels:

```bash
# Set operational state
bd set-state <issue-id> patrol=active --reason "Started monitoring"
bd set-state <issue-id> mode=degraded --reason "High error rate"

# Query state dimension
bd state <issue-id> patrol  # Output: active

# List all state dimensions
bd state list <issue-id>
```

Label format: `<dimension>:<value>` (e.g., `patrol:active`, `mode:degraded`)

### 5. Issue Data Structure

```json
{
  "id": "ai-kanban-board-abc",
  "title": "Example issue",
  "status": "awaiting_review",  // <-- Can be custom status
  "priority": 2,
  "issue_type": "task",
  "labels": ["patrol:active"],  // <-- Multi-dimensional state
  "created_at": "...",
  "updated_at": "..."
}
```

---

## Kanban Sync Feasibility

### Recommended Approach

1. **Configure custom statuses in beads to match kanban columns:**

```bash
bd config set status.custom "backlog,ready,in_review,testing"
```

2. **Column-to-Status Mapping:**

| Kanban Column | Beads Status |
|---------------|--------------|
| Ideas | open |
| Backlog | backlog (custom) |
| Ready | ready (custom) |
| In Progress | in_progress |
| AI Working | in_progress (same) |
| Review | in_review (custom) |
| Testing | testing (custom) |
| Done | closed |

3. **Sync Implementation:**

**Beads → Kanban:**
```bash
bd list --json  # Get all issues with status
# Map status to column
```

**Kanban → Beads:**
```bash
bd update <id> --status=<new_column_status>  # On card drag
```

### Considerations

| Aspect | Beads Support | Notes |
|--------|---------------|-------|
| Custom statuses | ✅ Yes | Via `status.custom` config |
| Status transitions | ✅ No restrictions | Any → Any |
| Column ordering | ❌ Not stored | Need kanban-side config |
| Column colors | ❌ Not stored | Need kanban-side config |
| WIP limits | ❌ Not stored | Need kanban-side config |
| Status filtering | ✅ Yes | `bd list --status=X` |
| JSON export | ✅ Yes | `bd list --json` |

### Limitations

1. **Column metadata not in beads** - Colors, icons, WIP limits, order must be stored in kanban config
2. **Multiple columns can map to same status** - e.g., "AI Working" and "In Progress" both map to `in_progress`
3. **Beads has special commands** - `bd close`, `bd defer`, `bd reopen` have side effects beyond just status change

### Suggested Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Kanban Board (UI Layer)                                │
│  ┌─────────┬─────────┬─────────┬─────────┬─────────┐   │
│  │ Backlog │ Ready   │ In Prog │ Review  │ Done    │   │
│  │(custom) │(custom) │(builtin)│(custom) │(builtin)│   │
│  └────┬────┴────┬────┴────┬────┴────┬────┴────┬────┘   │
│       │         │         │         │         │        │
└───────┼─────────┼─────────┼─────────┼─────────┼────────┘
        │         │         │         │         │
        ▼         ▼         ▼         ▼         ▼
┌─────────────────────────────────────────────────────────┐
│  Column Config (kanban-side)                            │
│  - Column order, colors, WIP limits, icons              │
│  - Status mapping rules                                 │
└─────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────┐
│  Beads (Issue Store)                                    │
│  bd config set status.custom "backlog,ready,in_review"  │
│  - Issue status: open|backlog|ready|in_progress|...    │
│  - bd update --status=X for transitions                 │
└─────────────────────────────────────────────────────────┘
```

---

## Related Beads Features

### Workflow Formulas (Advanced)

Beads has a formula/molecule system for workflow templates:

```bash
bd formula list          # List available formulas
bd formula show <name>   # Show formula details
bd mol pour <proto>      # Instantiate persistent workflow
bd mol wisp <proto>      # Instantiate ephemeral workflow
```

Formulas define workflow **steps** (child issues with dependencies), not status transitions. Not directly relevant for column sync, but could be useful for kanban workflow templates.

### Blocking/Dependencies

Beads tracks issue dependencies:
- `bd dep add <issue> <depends-on>` - Add dependency
- `bd blocked` - Show blocked issues
- `bd ready` - Show issues with no blockers

The `blocked` status is automatically computed from dependencies, separate from the `--status` field.

---

## Conclusion

**Bidirectional sync is feasible** with the following approach:

1. Use `bd config set status.custom` to define custom statuses matching kanban columns
2. Store column visual metadata (colors, order, WIP limits) in kanban-side config
3. Use `bd update --status=X` for status changes on card drag
4. Use `bd list --json` to sync beads → kanban
5. Handle special statuses (`closed`, `blocked`, `deferred`) with appropriate bd commands

No significant technical blockers identified.
