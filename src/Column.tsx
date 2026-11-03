import { useState } from 'react'
import { Card } from './Card'
import type { MoveDirection } from './Card'
import type { Card as CardType, Status } from './types'

interface Props {
  id: Status
  title: string
  cards: CardType[]
  draggingId: string | null
  onDragStart: (cardId: string) => void
  onDragEnd: () => void
  onAdd: () => void
  onEdit: (card: CardType) => void
  onMove: (cardId: string, status: Status, beforeId?: string) => void
  onKeyMove: (card: CardType, direction: MoveDirection) => void
}

export function Column({ id, title, cards, draggingId, onDragStart, onDragEnd, onAdd, onEdit, onMove, onKeyMove }: Props) {
  const [over, setOver] = useState(false)
  // where a drop would land: before this card id, or at the end when null
  const [overBefore, setOverBefore] = useState<string | null>(null)

  const clear = () => {
    setOver(false)
    setOverBefore(null)
  }

  const drop = (e: React.DragEvent, beforeId?: string) => {
    e.preventDefault()
    e.stopPropagation()
    clear()
    const cardId = e.dataTransfer.getData('text/plain')
    if (cardId) onMove(cardId, id, beforeId)
  }

  const dropLine = <div className="drop-line" aria-hidden="true" />

  return (
    <section
      className={`column${over ? ' over' : ''}`}
      aria-label={title}
      onDragOver={e => { e.preventDefault(); setOver(true); setOverBefore(null) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) clear() }}
      onDrop={e => drop(e)}
    >
      <header>
        <h2>{title}</h2>
        <span className="count">{cards.length}{' '}<span className="sr-only">{cards.length === 1 ? 'card' : 'cards'}</span></span>
      </header>

      <div className="cards" role="list" aria-label={`${title} cards`}>
        {cards.map(card => (
          <div key={card.id} className="slot" role="listitem">
            {over && overBefore === card.id && draggingId !== card.id && dropLine}
            <Card
              card={card}
              dragging={draggingId === card.id}
              onDragStart={() => onDragStart(card.id)}
              onDragEnd={() => { clear(); onDragEnd() }}
              onDragOver={() => { setOver(true); setOverBefore(card.id) }}
              onDrop={e => drop(e, card.id)}
              onEdit={() => onEdit(card)}
              onKeyMove={direction => onKeyMove(card, direction)}
            />
          </div>
        ))}
        {over && overBefore === null && draggingId && dropLine}
        {cards.length === 0 && !over && (
          <div className="empty">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <path d="m17 8-5-5-5 5" />
              <path d="M12 3v12" />
            </svg>
            <p>Drop a card here or add one below</p>
          </div>
        )}
      </div>

      <button className="add" onClick={onAdd}>
        + Add card{' '}
        <span className="sr-only">to {title}</span>
      </button>
    </section>
  )
}
