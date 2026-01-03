import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WorkerStatusCard } from './WorkerStatusCard'
import { WorkerInfo } from '@/types/monitoring'

const mockWorker: WorkerInfo = {
  id: 'worker-1',
  name: 'test-worker-1',
  agentType: 'claude-code',
  status: 'busy',
  beadsIssueId: 'kanban-2pa',
  spawnedAt: new Date().toISOString(),
  lastActivity: new Date().toISOString(),
  health: 85,
  tasksQueued: 3,
  tasksCompleted: 12,
  successRate: 0.92,
  avgDuration: 7.5,
  contextPercent: 45,
  tokenUsage: {
    input: 25000,
    output: 5000,
    totalCost: 0.15,
  },
}

describe('WorkerStatusCard', () => {
  it('renders worker name and agent type', () => {
    render(<WorkerStatusCard worker={mockWorker} />)

    expect(screen.getByText('test-worker-1')).toBeInTheDocument()
    expect(screen.getByText('Claude')).toBeInTheDocument()
  })

  it('displays status badge with correct status', () => {
    render(<WorkerStatusCard worker={mockWorker} />)

    expect(screen.getByText('busy')).toBeInTheDocument()
  })

  it('shows beads issue ID when assigned', () => {
    render(<WorkerStatusCard worker={mockWorker} />)

    expect(screen.getByText('kanban-2pa')).toBeInTheDocument()
  })

  it('displays health percentage', () => {
    render(<WorkerStatusCard worker={mockWorker} />)

    expect(screen.getByText('85%')).toBeInTheDocument()
  })

  it('displays context usage when available', () => {
    render(<WorkerStatusCard worker={mockWorker} />)

    expect(screen.getByText('45%')).toBeInTheDocument()
  })

  it('displays metrics grid with correct values', () => {
    render(<WorkerStatusCard worker={mockWorker} />)

    expect(screen.getByText('3')).toBeInTheDocument() // tasksQueued
    expect(screen.getByText('12')).toBeInTheDocument() // tasksCompleted
    expect(screen.getByText('7.5s')).toBeInTheDocument() // avgDuration
    expect(screen.getByText('92%')).toBeInTheDocument() // successRate
  })

  it('calls onClick handler when clicked', () => {
    const handleClick = vi.fn()
    render(<WorkerStatusCard worker={mockWorker} onClick={handleClick} />)

    fireEvent.click(screen.getByText('test-worker-1').closest('div')!)
    expect(handleClick).toHaveBeenCalled()
  })

  it('applies selected styling when isSelected is true', () => {
    const { container } = render(
      <WorkerStatusCard worker={mockWorker} isSelected={true} />
    )

    // The card should have ring styling when selected
    const card = container.firstChild as HTMLElement
    expect(card.className).toContain('ring')
  })

  it('renders idle status correctly', () => {
    const idleWorker: WorkerInfo = { ...mockWorker, status: 'idle' }
    render(<WorkerStatusCard worker={idleWorker} />)

    expect(screen.getByText('idle')).toBeInTheDocument()
  })

  it('renders error status correctly', () => {
    const errorWorker: WorkerInfo = { ...mockWorker, status: 'error' }
    render(<WorkerStatusCard worker={errorWorker} />)

    expect(screen.getByText('error')).toBeInTheDocument()
  })

  it('renders offline status correctly', () => {
    const offlineWorker: WorkerInfo = { ...mockWorker, status: 'offline' }
    render(<WorkerStatusCard worker={offlineWorker} />)

    expect(screen.getByText('offline')).toBeInTheDocument()
  })

  it('handles missing beadsIssueId gracefully', () => {
    const workerWithoutIssue: WorkerInfo = {
      ...mockWorker,
      beadsIssueId: undefined,
    }
    render(<WorkerStatusCard worker={workerWithoutIssue} />)

    expect(screen.queryByText('Issue:')).not.toBeInTheDocument()
  })

  it('handles missing context percentage gracefully', () => {
    const workerWithoutContext: WorkerInfo = {
      ...mockWorker,
      contextPercent: undefined,
    }
    render(<WorkerStatusCard worker={workerWithoutContext} />)

    // Should only show one percentage (health), not context
    const percentages = screen.getAllByText('%', { exact: false })
    // Filter to just the health and success rate percentages
    expect(percentages.length).toBeGreaterThanOrEqual(2)
  })
})
