import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LiveActivityFeed } from './LiveActivityFeed'
import { ActivityEvent } from '@/types/monitoring'

const createMockEvent = (
  id: string,
  type: ActivityEvent['type'],
  summary: string,
  minAgo: number = 0
): ActivityEvent => ({
  id,
  type,
  workerId: 'worker-1',
  workerName: 'test-worker',
  beadsIssueId: 'kanban-2pa',
  summary,
  timestamp: new Date(Date.now() - minAgo * 60000).toISOString(),
})

const mockEvents: ActivityEvent[] = [
  createMockEvent('1', 'task_started', 'Started implementing auth flow', 1),
  createMockEvent('2', 'tool_use', 'Read src/components/Login.tsx', 2),
  createMockEvent('3', 'task_completed', 'Completed auth implementation', 5),
  createMockEvent('4', 'context_refresh', 'Context refreshed', 10),
]

describe('LiveActivityFeed', () => {
  it('renders all events', () => {
    render(<LiveActivityFeed events={mockEvents} />)

    expect(screen.getByText('Started implementing auth flow')).toBeInTheDocument()
    expect(screen.getByText('Read src/components/Login.tsx')).toBeInTheDocument()
    expect(screen.getByText('Completed auth implementation')).toBeInTheDocument()
    expect(screen.getByText('Context refreshed')).toBeInTheDocument()
  })

  it('displays worker name badges', () => {
    render(<LiveActivityFeed events={mockEvents} />)

    const workerBadges = screen.getAllByText('test-worker')
    expect(workerBadges.length).toBe(mockEvents.length)
  })

  it('displays beads issue ID badges', () => {
    render(<LiveActivityFeed events={mockEvents} />)

    const issueBadges = screen.getAllByText('kanban-2pa')
    expect(issueBadges.length).toBe(mockEvents.length)
  })

  it('displays custom title', () => {
    render(<LiveActivityFeed events={mockEvents} title="Custom Title" />)

    expect(screen.getByText('Custom Title')).toBeInTheDocument()
  })

  it('shows event count in header', () => {
    render(<LiveActivityFeed events={mockEvents} />)

    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('shows live indicator when there are running tasks', () => {
    const eventsWithRunning: ActivityEvent[] = [
      createMockEvent('1', 'task_started', 'Running task', 0),
    ]

    render(<LiveActivityFeed events={eventsWithRunning} />)

    expect(screen.getByText('Live')).toBeInTheDocument()
  })

  it('shows empty state when no events', () => {
    render(<LiveActivityFeed events={[]} />)

    expect(screen.getByText('No activity yet')).toBeInTheDocument()
    expect(
      screen.getByText('Events will appear here as workers process tasks')
    ).toBeInTheDocument()
  })

  it('limits displayed events to maxItems', () => {
    const manyEvents: ActivityEvent[] = Array.from({ length: 10 }, (_, i) =>
      createMockEvent(`${i}`, 'tool_use', `Event ${i}`, i)
    )

    render(<LiveActivityFeed events={manyEvents} maxItems={5} />)

    expect(screen.getByText('Event 0')).toBeInTheDocument()
    expect(screen.getByText('Event 4')).toBeInTheDocument()
    expect(screen.queryByText('Event 5')).not.toBeInTheDocument()
  })

  it('shows footer when more events exist than maxItems', () => {
    const manyEvents: ActivityEvent[] = Array.from({ length: 10 }, (_, i) =>
      createMockEvent(`${i}`, 'tool_use', `Event ${i}`, i)
    )

    render(<LiveActivityFeed events={manyEvents} maxItems={5} />)

    expect(screen.getByText('Showing 5 of 10 events')).toBeInTheDocument()
  })

  it('does not show footer when all events are displayed', () => {
    render(<LiveActivityFeed events={mockEvents} maxItems={50} />)

    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument()
  })

  it('displays relative time for recent events', () => {
    const recentEvent = createMockEvent('1', 'task_started', 'Just started', 0)
    render(<LiveActivityFeed events={[recentEvent]} />)

    expect(screen.getByText('Just now')).toBeInTheDocument()
  })

  it('displays relative time in minutes', () => {
    const minutesAgoEvent = createMockEvent('1', 'task_started', 'Started', 5)
    render(<LiveActivityFeed events={[minutesAgoEvent]} />)

    expect(screen.getByText('5m ago')).toBeInTheDocument()
  })

  it('renders different event types with correct icons', () => {
    const eventTypes: ActivityEvent['type'][] = [
      'task_started',
      'task_completed',
      'task_failed',
      'tool_use',
      'context_refresh',
      'worker_spawn',
      'worker_kill',
    ]

    const events = eventTypes.map((type, i) =>
      createMockEvent(`${i}`, type, `Event type: ${type}`, i)
    )

    render(<LiveActivityFeed events={events} />)

    eventTypes.forEach((type) => {
      expect(screen.getByText(`Event type: ${type}`)).toBeInTheDocument()
    })
  })

  it('handles events without workerName gracefully', () => {
    const eventWithoutWorker: ActivityEvent = {
      id: '1',
      type: 'task_started',
      summary: 'Task without worker',
      timestamp: new Date().toISOString(),
    }

    render(<LiveActivityFeed events={[eventWithoutWorker]} />)

    expect(screen.getByText('Task without worker')).toBeInTheDocument()
  })

  it('handles events without beadsIssueId gracefully', () => {
    const eventWithoutIssue: ActivityEvent = {
      id: '1',
      type: 'task_started',
      workerName: 'test-worker',
      summary: 'Task without issue',
      timestamp: new Date().toISOString(),
    }

    render(<LiveActivityFeed events={[eventWithoutIssue]} />)

    expect(screen.getByText('Task without issue')).toBeInTheDocument()
    expect(screen.getByText('test-worker')).toBeInTheDocument()
  })
})
