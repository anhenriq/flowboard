import type { Card as CardType } from './types'

export type MoveDirection = 'up' | 'down' | 'left' | 'right'

interface Props {
  card: CardType
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onDragOver: () => void
  onDrop: (e: React.DragEvent) => void
  onEdit: () => void
  onKeyMove: (direction: MoveDirection) => void
}

// local date, not UTC, so a card isn't flagged overdue a day early in the evening
const today = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDue(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

const ARROWS: Record<string, MoveDirection> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
}

export function Card({ card, dragging, onDragStart, onDragEnd, onDragOver, onDrop, onEdit, onKeyMove }: Props) {
  const overdue = card.dueDate && card.status !== 'done' && card.dueDate < today()

  // one spoken summary, since a button's children aren't read separately
  const label = [
    card.title,
    card.priority !== 'None' && `${card.priority} priority`,
    card.dueDate && `${overdue ? 'overdue, ' : ''}due ${formatDue(card.dueDate)}`,
    card.assignee && `assigned to ${card.assignee}`,
  ].filter(Boolean).join(', ')

  return (
    <div
      className={`card${dragging ? ' dragging' : ''}`}
      role="button"
      data-card-id={card.id}
      aria-label={label}
      aria-description="Press Enter to edit. Hold Alt and use arrow keys to move."
      draggable
      tabIndex={0}
      onDragStart={e => {
        e.dataTransfer.setData('text/plain', card.id)
        e.dataTransfer.effectAllowed = 'move'
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      onDragOver={e => {
        // handle it here so the column doesn't reset the target to "end of column"
        e.preventDefault()
        e.stopPropagation()
        onDragOver()
      }}
      onDrop={onDrop}
      onClick={onEdit}
      onKeyDown={e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onEdit()
        } else if (e.altKey && ARROWS[e.key]) {
          e.preventDefault()
          onKeyMove(ARROWS[e.key])
        }
      }}
    >
      <div className="card-title">{card.title}</div>
      <div className="meta">
        {card.priority !== 'None' && (
          <span className={`badge ${card.priority.toLowerCase()}`}>{card.priority}</span>
        )}
        {card.dueDate && (
          <span className={`due${overdue ? ' overdue' : ''}`}>
            {overdue && <span className="sr-only">Overdue: </span>}
            {formatDue(card.dueDate)}
          </span>
        )}
        {card.assignee && (
          <span className="assignee" title={card.assignee}>
            <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
              <circle cx="8" cy="5" r="3" />
              <path d="M2 14c0-3.3 2.7-5 6-5s6 1.7 6 5z" />
            </svg>
            <span className="assignee-name">{card.assignee}</span>
          </span>
        )}
      </div>
    </div>
  )
}
