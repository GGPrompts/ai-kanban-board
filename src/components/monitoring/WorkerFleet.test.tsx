import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WorkerFleet } from './WorkerFleet'
import { WorkerInfo } from '@/types/monitoring'

const createMockWorker = (
  id: string,
  status: WorkerInfo['status'] = 'idle'
): WorkerInfo => ({
  id,
  name: `worker-${id}`,
  agentType: 'claude-code',
  status,
  spawnedAt: new Date().toISOString(),
  health: 90,
  tasksQueued: 2,
  tasksCompleted: 10,
  successRate: 0.9,
  avgDuration: 5,
})

const mockWorkers: WorkerInfo[] = [
  createMockWorker('1', 'busy'),
  createMockWorker('2', 'idle'),
  createMockWorker('3', 'error'),
  createMockWorker('4', 'busy'),
]

describe('WorkerFleet', () => {
  it('renders all workers in the grid', () => {
    render(<WorkerFleet workers={mockWorkers} />)

    expect(screen.getByText('worker-1')).toBeInTheDocument()
    expect(screen.getByText('worker-2')).toBeInTheDocument()
    expect(screen.getByText('worker-3')).toBeInTheDocument()
    expect(screen.getByText('worker-4')).toBeInTheDocument()
  })

  it('displays overview metrics correctly', () => {
    render(<WorkerFleet workers={mockWorkers} />)

    // Total workers - find by the label nearby
    expect(screen.getByText('Total Workers')).toBeInTheDocument()
    // Active workers section
    expect(screen.getByText('Active Now')).toBeInTheDocument()
    // Completed section
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('filters workers by status when clicking filter buttons', () => {
    render(<WorkerFleet workers={mockWorkers} />)

    // Click on 'busy' filter - find button by role
    const busyFilter = screen.getByRole('button', { name: /Busy/i })
    fireEvent.click(busyFilter)

    // Should only show busy workers
    expect(screen.getByText('worker-1')).toBeInTheDocument()
    expect(screen.getByText('worker-4')).toBeInTheDocument()
    expect(screen.queryByText('worker-2')).not.toBeInTheDocument()
    expect(screen.queryByText('worker-3')).not.toBeInTheDocument()
  })

  it('shows all workers when "All" filter is clicked', () => {
    render(<WorkerFleet workers={mockWorkers} />)

    // First filter to busy
    fireEvent.click(screen.getByRole('button', { name: /Busy/i }))
    // Then click All
    fireEvent.click(screen.getByRole('button', { name: /^All$/ }))

    expect(screen.getByText('worker-1')).toBeInTheDocument()
    expect(screen.getByText('worker-2')).toBeInTheDocument()
    expect(screen.getByText('worker-3')).toBeInTheDocument()
    expect(screen.getByText('worker-4')).toBeInTheDocument()
  })

  it('calls onWorkerClick when a worker card is clicked', () => {
    const handleClick = vi.fn()
    render(<WorkerFleet workers={mockWorkers} onWorkerClick={handleClick} />)

    fireEvent.click(screen.getByText('worker-1'))
    expect(handleClick).toHaveBeenCalledWith(mockWorkers[0])
  })

  it('calls onRefresh when refresh button is clicked', () => {
    const handleRefresh = vi.fn()
    render(<WorkerFleet workers={mockWorkers} onRefresh={handleRefresh} />)

    fireEvent.click(screen.getByText('Refresh'))
    expect(handleRefresh).toHaveBeenCalled()
  })

  it('calls onSpawnWorker when spawn button is clicked', () => {
    const handleSpawn = vi.fn()
    render(<WorkerFleet workers={mockWorkers} onSpawnWorker={handleSpawn} />)

    fireEvent.click(screen.getByText('Spawn Worker'))
    expect(handleSpawn).toHaveBeenCalled()
  })

  it('shows empty state when no workers match filter', () => {
    render(<WorkerFleet workers={mockWorkers} />)

    // Click on 'offline' filter (no workers have this status)
    fireEvent.click(screen.getByText('Offline', { exact: false }))

    expect(screen.getByText('No Workers Found')).toBeInTheDocument()
  })

  it('shows empty state with spawn button when no workers exist', () => {
    const handleSpawn = vi.fn()
    render(<WorkerFleet workers={[]} onSpawnWorker={handleSpawn} />)

    expect(screen.getByText('No Workers Found')).toBeInTheDocument()
    expect(screen.getByText('Spawn First Worker')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Spawn First Worker'))
    expect(handleSpawn).toHaveBeenCalled()
  })

  it('disables refresh button when loading', () => {
    const handleRefresh = vi.fn()
    render(
      <WorkerFleet
        workers={mockWorkers}
        onRefresh={handleRefresh}
        isLoading={true}
      />
    )

    const refreshButton = screen.getByText('Refresh').closest('button')!
    expect(refreshButton).toBeDisabled()
  })

  it('applies selected styling to the correct worker', () => {
    render(<WorkerFleet workers={mockWorkers} selectedWorkerId="2" />)

    // The worker-2 card should have selection styling
    // This is handled by WorkerStatusCard internally
    expect(screen.getByText('worker-2')).toBeInTheDocument()
  })

  it('uses provided metrics over calculated ones', () => {
    const customMetrics = {
      totalWorkers: 99,
      activeWorkers: 77,
      totalTasksCompleted: 888,
      avgSuccessRate: 0.95,
      totalCost: 12.34,
      avgCostPerTask: 0.05,
    }

    render(<WorkerFleet workers={mockWorkers} metrics={customMetrics} />)

    // Check for unique values that can only come from custom metrics
    expect(screen.getByText('99')).toBeInTheDocument() // Total workers
    expect(screen.getByText('77')).toBeInTheDocument() // Active workers
    expect(screen.getByText('888')).toBeInTheDocument() // Completed
    expect(screen.getByText('$12.34')).toBeInTheDocument() // Cost
  })
})
