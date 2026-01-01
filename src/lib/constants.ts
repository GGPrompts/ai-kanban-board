import { COLUMN_PRESETS } from '@/types'

export type BoardTemplateKey = 'simple' | 'standard' | 'complex' | 'full'

export interface BoardTemplate {
  name: string
  columns: Array<{
    title: string
    color: string
  }>
}

export const BOARD_TEMPLATES: Record<BoardTemplateKey, BoardTemplate> = {
  simple: {
    name: 'Simple',
    columns: [
      { title: 'Backlog', color: COLUMN_PRESETS.backlog.color },
      { title: 'In Progress', color: COLUMN_PRESETS.inProgress.color },
      { title: 'Done', color: COLUMN_PRESETS.done.color },
    ],
  },
  standard: {
    name: 'Standard',
    columns: [
      { title: 'Backlog', color: COLUMN_PRESETS.backlog.color },
      { title: 'Ready', color: COLUMN_PRESETS.ready.color },
      { title: 'In Progress', color: COLUMN_PRESETS.inProgress.color },
      { title: 'Review', color: COLUMN_PRESETS.review.color },
      { title: 'Done', color: COLUMN_PRESETS.done.color },
    ],
  },
  complex: {
    name: 'Complex',
    columns: [
      { title: 'Ideas', color: COLUMN_PRESETS.ideas.color },
      { title: 'Backlog', color: COLUMN_PRESETS.backlog.color },
      { title: 'Ready', color: COLUMN_PRESETS.ready.color },
      { title: 'In Progress', color: COLUMN_PRESETS.inProgress.color },
      { title: 'AI Working', color: COLUMN_PRESETS.aiWorking.color },
      { title: 'Review', color: COLUMN_PRESETS.review.color },
      { title: 'QA', color: COLUMN_PRESETS.qa.color },
      { title: 'Done', color: COLUMN_PRESETS.done.color },
    ],
  },
  full: {
    name: 'Full Workflow',
    columns: [
      { title: 'Ideas', color: COLUMN_PRESETS.ideas.color },
      { title: 'Triage', color: COLUMN_PRESETS.triage.color },
      { title: 'Backlog', color: COLUMN_PRESETS.backlog.color },
      { title: 'Spec', color: COLUMN_PRESETS.spec.color },
      { title: 'Ready', color: COLUMN_PRESETS.ready.color },
      { title: 'In Progress', color: COLUMN_PRESETS.inProgress.color },
      { title: 'AI Working', color: COLUMN_PRESETS.aiWorking.color },
      { title: 'Review', color: COLUMN_PRESETS.review.color },
      { title: 'QA', color: COLUMN_PRESETS.qa.color },
      { title: 'Deployed', color: COLUMN_PRESETS.deployed.color },
    ],
  },
}
