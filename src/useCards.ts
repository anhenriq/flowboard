import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import type { Card, CardInput, Priority, Status } from './types'

interface CardRow {
  id: string
  title: string
  assignee: string
  priority: string
  due_date: string | null
  status: string
  position: number
}

const toCard = (r: CardRow): Card => ({
  id: r.id,
  title: r.title,
  assignee: r.assignee,
  priority: r.priority as Priority,
  dueDate: r.due_date ?? '',
  status: r.status as Status,
})

const toColumns = (input: CardInput) => ({
  title: input.title,
  assignee: input.assignee,
  priority: input.priority,
  due_date: input.dueDate || null,
})

const SELECT = 'id, title, assignee, priority, due_date, status, position'

// cards added optimistically carry a temporary id until the database returns the real row
const isTemp = (id: string) => id.startsWith('tmp-')

// Cards are kept in display order (by position) so the board can just filter by status.
// The latest cards and positions also live in refs so rapid actions (two quick adds,
// back-to-back moves) compute from current data rather than a stale render's closure.
export function useCards() {
  const [cards, setCards] = useState<Card[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const cardsRef = useRef<Card[]>([])
  // sort order for each card, tracked alongside the cards themselves
  const positionsRef = useRef<Record<string, number>>({})
  const tempSeq = useRef(0)

  const commit = useCallback((nextCards: Card[], nextPositions: Record<string, number>) => {
    cardsRef.current = nextCards
    positionsRef.current = nextPositions
    setCards(nextCards)
  }, [])

  // `clearError` is false when resyncing after a failed write, so that error stays visible
  const load = useCallback(async (clearError = true) => {
    const { data, error } = await supabase
      .from('cards')
      .select(SELECT)
      .order('position')
    if (error) {
      setError(error.message)
    } else {
      if (clearError) setError('')
      commit(data.map(toCard), Object.fromEntries(data.map(r => [r.id, r.position])))
    }
    setLoading(false)
  }, [commit])

  useEffect(() => {
    load()
  }, [load])

  const dismissError = useCallback(() => setError(''), [])
  const retry = useCallback(() => load(), [load])

  // After a failed write, report it and resync with what the database actually holds.
  const fail = useCallback((message: string) => {
    setError(message)
    load(false)
  }, [load])

  // Show the card right away, then swap in the saved row (real id) once the insert returns.
  const insertCard = useCallback(async (input: CardInput, status: Status, position: number) => {
    const tempId = `tmp-${++tempSeq.current}`
    const current = cardsRef.current
    // keep the column in position order
    const nextIdx = current.findIndex(c => c.status === status && positionsRef.current[c.id] > position)
    const next = [...current]
    next.splice(nextIdx === -1 ? next.length : nextIdx, 0, { id: tempId, ...input, status })
    commit(next, { ...positionsRef.current, [tempId]: position })

    const { data, error } = await supabase
      .from('cards')
      .insert({ ...toColumns(input), status, position })
      .select(SELECT)
      .single()
    if (error) return fail(error.message)

    const { [tempId]: _temp, ...positions } = positionsRef.current
    commit(
      cardsRef.current.map(c => (c.id === tempId ? toCard(data) : c)),
      { ...positions, [data.id]: data.position },
    )
  }, [commit, fail])

  const addCard = useCallback((input: CardInput, status: Status) => {
    const last = Math.max(
      0,
      ...cardsRef.current.filter(c => c.status === status).map(c => positionsRef.current[c.id]),
    )
    return insertCard(input, status, last + 1)
  }, [insertCard])

  const updateCard = useCallback(async (id: string, input: CardInput) => {
    if (isTemp(id)) return
    commit(cardsRef.current.map(c => (c.id === id ? { ...c, ...input } : c)), positionsRef.current)
    const { error } = await supabase.from('cards').update(toColumns(input)).eq('id', id)
    if (error) fail(error.message)
  }, [commit, fail])

  // Returns what was removed so the caller can offer an undo via restoreCard.
  const deleteCard = useCallback((id: string) => {
    const card = cardsRef.current.find(c => c.id === id)
    if (!card || isTemp(id)) return undefined
    const position = positionsRef.current[id]
    commit(cardsRef.current.filter(c => c.id !== id), positionsRef.current)
    supabase.from('cards').delete().eq('id', id).then(({ error }) => {
      if (error) fail(error.message)
    })
    return { card, position }
  }, [commit, fail])

  // Undo a delete: re-insert the card in its old spot (it gets a new id).
  const restoreCard = useCallback(({ card, position }: { card: Card; position: number }) => {
    const { id: _id, status, ...input } = card
    return insertCard(input, status, position)
  }, [insertCard])

  // Move a card to `status`, placed before `beforeId` (or at the end of the column).
  const moveCard = useCallback(async (id: string, status: Status, beforeId?: string) => {
    const cards = cardsRef.current
    const positions = positionsRef.current
    const card = cards.find(c => c.id === id)
    if (!card || id === beforeId || isTemp(id)) return

    const column = cards.filter(c => c.status === status && c.id !== id)
    const beforeIdx = beforeId ? column.findIndex(c => c.id === beforeId) : -1

    // pick a position between the neighbours so no other card needs rewriting
    let position: number
    if (beforeIdx === -1) {
      position = (column.length ? positions[column[column.length - 1].id] : 0) + 1
    } else {
      const next = positions[column[beforeIdx].id]
      const prev = beforeIdx > 0 ? positions[column[beforeIdx - 1].id] : next - 2
      position = (prev + next) / 2
    }

    // optimistic: reorder locally first
    const moved = { ...card, status }
    const rest = cards.filter(c => c.id !== id)
    const insertAt = beforeIdx === -1
      ? rest.reduce((last, c, i) => (c.status === status ? i : last), -1) + 1
      : rest.findIndex(c => c.id === beforeId)
    rest.splice(insertAt, 0, moved)
    commit(rest, { ...positions, [id]: position })

    const { error } = await supabase.from('cards').update({ status, position }).eq('id', id)
    if (error) fail(error.message)
  }, [commit, fail])

  return {
    cards, loading, error, dismissError, retry,
    addCard, updateCard, deleteCard, restoreCard, moveCard,
  }
}
