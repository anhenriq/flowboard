import { useCallback, useEffect, useRef, useState } from 'react'
import { CardModal } from './CardModal'
import type { MoveDirection } from './Card'
import { Column } from './Column'
import { COLUMNS } from './types'
import type { Card, Status } from './types'
import { useCards } from './useCards'

// editing an existing card, or creating one in a given column
type ModalState = { card: Card } | { status: Status } | null

type Removed = { card: Card; position: number }

const UNDO_MS = 10000

const columnTitle = (status: Status) => COLUMNS.find(c => c.id === status)!.title

export function Board() {
  const {
    cards, loading, error, dismissError, retry,
    addCard, updateCard, deleteCard, restoreCard, moveCard,
  } = useCards()
  const [modal, setModal] = useState<ModalState>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [removed, setRemoved] = useState<Removed | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const undoTimer = useRef<number>(undefined)
  // a moved card remounts when it changes column, so put keyboard focus back on it afterwards
  const refocusId = useRef<string | null>(null)
  // stable so the modal's effect doesn't re-run (and re-focus) on every board render
  const close = useCallback(() => setModal(null), [])

  useEffect(() => () => window.clearTimeout(undoTimer.current), [])

  useEffect(() => {
    if (!refocusId.current) return
    document.querySelector<HTMLElement>(`[data-card-id="${refocusId.current}"]`)?.focus()
    refocusId.current = null
  }, [cards])

  const startUndoTimer = () => {
    window.clearTimeout(undoTimer.current)
    undoTimer.current = window.setTimeout(() => setRemoved(null), UNDO_MS)
  }

  const remove = (id: string) => {
    const result = deleteCard(id)
    if (!result) return
    setRemoved(result)
    startUndoTimer()
    setAnnouncement(`Deleted ${result.card.title}. Undo is available.`)
  }

  const undo = () => {
    if (!removed) return
    restoreCard(removed)
    window.clearTimeout(undoTimer.current)
    setAnnouncement(`Restored ${removed.card.title}`)
    setRemoved(null)
  }

  // Alt+arrow keys: up/down reorder within the column, left/right change column
  const keyMove = (card: Card, direction: MoveDirection) => {
    const column = cards.filter(c => c.status === card.status)
    const index = column.findIndex(c => c.id === card.id)
    refocusId.current = card.id

    if (direction === 'up' || direction === 'down') {
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= column.length) {
        setAnnouncement(`${card.title} is already ${direction === 'up' ? 'first' : 'last'} in ${columnTitle(card.status)}`)
        return
      }
      // moving down means going before the card two places on (or to the end)
      const beforeId = direction === 'up' ? column[target].id : column[target + 1]?.id
      moveCard(card.id, card.status, beforeId)
      setAnnouncement(`Moved ${card.title} to position ${target + 1} of ${column.length} in ${columnTitle(card.status)}`)
      return
    }

    const colIndex = COLUMNS.findIndex(c => c.id === card.status)
    const next = COLUMNS[colIndex + (direction === 'left' ? -1 : 1)]
    if (!next) {
      setAnnouncement(`${card.title} is already in the ${direction === 'left' ? 'first' : 'last'} column`)
      return
    }
    moveCard(card.id, next.id)
    const size = cards.filter(c => c.status === next.id).length + 1
    setAnnouncement(`Moved ${card.title} to ${next.title}, position ${size} of ${size}`)
  }

  const empty = !loading && !error && cards.length === 0

  return (
    <>
      {error && (
        <div className="error banner" role="alert">
          <span>{error}</span>
          <span className="spacer" />
          {loading || cards.length === 0 ? <button onClick={retry}>Retry</button> : null}
          <button onClick={dismissError} aria-label="Dismiss error">✕</button>
        </div>
      )}
      {loading && <p className="notice" role="status">Loading cards…</p>}
      {empty && (
        <div className="welcome">
          <h2>Welcome to FlowBoard</h2>
          <p>Track work across Backlog, In Progress, In Review and Done. Drag cards between columns as they move along.</p>
          <button className="primary" onClick={() => setModal({ status: 'backlog' })}>
            Create your first card
          </button>
        </div>
      )}
      <main className="board" id="board" tabIndex={-1}>
        {COLUMNS.map(col => (
          <Column
            key={col.id}
            id={col.id}
            title={col.title}
            cards={cards.filter(c => c.status === col.id)}
            draggingId={draggingId}
            onDragStart={setDraggingId}
            onDragEnd={() => setDraggingId(null)}
            onAdd={() => setModal({ status: col.id })}
            onEdit={card => setModal({ card })}
            onKeyMove={keyMove}
            onMove={(id, status, beforeId) => {
              // the source card can unmount mid-drag, so dragend isn't guaranteed to fire
              setDraggingId(null)
              moveCard(id, status, beforeId)
            }}
          />
        ))}
      </main>

      {modal && (
        <CardModal
          key={'card' in modal ? modal.card.id : 'new'}
          card={'card' in modal ? modal.card : null}
          status={'card' in modal ? modal.card.status : modal.status}
          onClose={close}
          onSave={(input, status) => {
            if ('card' in modal) {
              updateCard(modal.card.id, input)
              if (status !== modal.card.status) {
                // the card remounts in its new column, so the dialog's focus return can't find it
                refocusId.current = modal.card.id
                moveCard(modal.card.id, status)
                setAnnouncement(`Moved ${input.title} to ${columnTitle(status)}`)
              }
            } else {
              addCard(input, status)
            }
            close()
          }}
          onDelete={'card' in modal ? () => {
            remove(modal.card.id)
            close()
          } : undefined}
        />
      )}

      {/* polite, so moves and deletes are spoken without interrupting */}
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>

      {removed && (
        // paused while hovered or focused so slower users have time to reach Undo
        <div
          className="toast"
          role="status"
          onMouseEnter={() => window.clearTimeout(undoTimer.current)}
          onMouseLeave={startUndoTimer}
          onFocus={() => window.clearTimeout(undoTimer.current)}
          onBlur={startUndoTimer}
        >
          <span>Deleted “{removed.card.title}”</span>
          <button onClick={undo}>Undo</button>
        </div>
      )}
    </>
  )
}
