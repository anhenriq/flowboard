export const COLUMNS = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'in-review', title: 'In Review' },
  { id: 'done', title: 'Done' },
] as const

export type Status = (typeof COLUMNS)[number]['id']

export const PRIORITIES = ['High', 'Medium', 'Low', 'None'] as const
export type Priority = (typeof PRIORITIES)[number]

export interface Card {
  id: string
  title: string
  assignee: string
  priority: Priority
  dueDate: string // yyyy-mm-dd, empty when unset
  status: Status
}

export type CardInput = Omit<Card, 'id' | 'status'>
