import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { fake } from './test/fakeSupabase'
import type { CardInput } from './types'
import { useCards } from './useCards'

vi.mock('./supabase', async () => {
  const { fake } = await import('./test/fakeSupabase')
  return { supabase: fake.client, supabaseConfigured: true }
})

const input = (overrides: Partial<CardInput> = {}): CardInput => ({
  title: 'New card',
  assignee: '',
  priority: 'Medium',
  dueDate: '',
  ...overrides,
})

async function setup() {
  const hook = renderHook(() => useCards())
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

const titles = (cards: { title: string }[]) => cards.map(c => c.title)

describe('loading', () => {
  it('shows cards in position order', async () => {
    fake.seed([
      { title: 'third', position: 3 },
      { title: 'first', position: 1 },
      { title: 'second', position: 2 },
    ])
    const { result } = await setup()
    expect(titles(result.current.cards)).toEqual(['first', 'second', 'third'])
  })

  it('reports a load failure and offers retry', async () => {
    fake.failNext('select', 'cannot reach database')
    const { result } = await setup()
    expect(result.current.error).toBe('cannot reach database')
    expect(result.current.cards).toEqual([])

    fake.seed([{ title: 'after retry' }])
    await act(() => result.current.retry())
    expect(result.current.error).toBe('')
    expect(titles(result.current.cards)).toEqual(['after retry'])
  })
})

describe('creating a card', () => {
  it('shows it immediately, then swaps in the saved row', async () => {
    const { result } = await setup()
    const release = fake.holdNext('insert')

    act(() => { void result.current.addCard(input({ title: 'Write docs', priority: 'High' }), 'in-progress') })

    // optimistic: visible before the database answers, with a temporary id
    expect(result.current.cards).toHaveLength(1)
    expect(result.current.cards[0]).toMatchObject({ title: 'Write docs', status: 'in-progress' })
    expect(result.current.cards[0].id).toMatch(/^tmp-/)

    release()
    await waitFor(() => expect(result.current.cards[0].id).toMatch(/^row-/))
    expect(fake.rows()).toHaveLength(1)
    expect(fake.rows()[0]).toMatchObject({ title: 'Write docs', priority: 'High', status: 'in-progress', due_date: null })
  })

  it('stores an empty due date as null and a set one as given', async () => {
    const { result } = await setup()
    await act(() => result.current.addCard(input({ title: 'a' }), 'backlog'))
    await act(() => result.current.addCard(input({ title: 'b', dueDate: '2026-12-01' }), 'backlog'))
    expect(fake.rows().map(r => r.due_date)).toEqual([null, '2026-12-01'])
  })

  it('gives two quick adds to one column different positions', async () => {
    const { result } = await setup()
    await act(async () => {
      // both calls start before either finishes, which used to compute the same position
      await Promise.all([
        result.current.addCard(input({ title: 'one' }), 'backlog'),
        result.current.addCard(input({ title: 'two' }), 'backlog'),
      ])
    })
    const positions = fake.rows().map(r => r.position)
    expect(new Set(positions).size).toBe(2)
    expect(titles(result.current.cards)).toEqual(['one', 'two'])
  })

  it('removes the optimistic card and shows the error when saving fails', async () => {
    const { result } = await setup()
    fake.failNext('insert', 'permission denied')
    await act(() => result.current.addCard(input(), 'backlog'))
    await waitFor(() => expect(result.current.error).toBe('permission denied'))
    expect(result.current.cards).toEqual([])
  })
})

describe('editing a card', () => {
  it('updates the card immediately and sends the changed columns', async () => {
    fake.seed([{ title: 'old', priority: 'Low', due_date: '2026-11-01' }])
    const { result } = await setup()
    const id = result.current.cards[0].id
    const release = fake.holdNext('update')

    act(() => { void result.current.updateCard(id, input({ title: 'new', priority: 'High', assignee: 'Maya', dueDate: '' })) })
    expect(result.current.cards[0]).toMatchObject({ title: 'new', priority: 'High', assignee: 'Maya' })

    release()
    await waitFor(() => expect(fake.rows()[0].title).toBe('new'))
    expect(fake.rows()[0]).toMatchObject({ priority: 'High', assignee: 'Maya', due_date: null })
  })

  it('keeps the error visible after resyncing from a failed save', async () => {
    fake.seed([{ title: 'original' }])
    const { result } = await setup()
    fake.failNext('update', 'write failed')

    await act(() => result.current.updateCard(result.current.cards[0].id, input({ title: 'edited' })))

    // regression: the refetch after a failure used to clear the message straight away
    await waitFor(() => expect(fake.calls().filter(c => c.op === 'select')).toHaveLength(2))
    expect(result.current.error).toBe('write failed')
    expect(result.current.cards[0].title).toBe('original')
  })

  it('lets the error be dismissed', async () => {
    fake.seed([{}])
    const { result } = await setup()
    fake.failNext('update', 'write failed')
    await act(() => result.current.updateCard(result.current.cards[0].id, input()))
    await waitFor(() => expect(result.current.error).toBe('write failed'))

    act(() => result.current.dismissError())
    expect(result.current.error).toBe('')
  })
})

describe('moving a card', () => {
  it('moves to the end of another column with a single row update', async () => {
    fake.seed([
      { title: 'A', status: 'backlog', position: 1 },
      { title: 'C', status: 'done', position: 1 },
    ])
    const { result } = await setup()
    const a = result.current.cards.find(c => c.title === 'A')!
    fake.calls().length = 0

    await act(() => result.current.moveCard(a.id, 'done'))

    expect(result.current.cards.find(c => c.title === 'A')!.status).toBe('done')
    const writes = fake.calls().filter(c => c.op !== 'select')
    expect(writes).toHaveLength(1)
    expect(writes[0].values).toEqual({ status: 'done', position: 2 })
  })

  it('places a card between its neighbours using the midpoint position', async () => {
    fake.seed([
      { title: 'A', position: 1 },
      { title: 'B', position: 2 },
      { title: 'C', position: 3 },
    ])
    const { result } = await setup()
    const [, b, c] = result.current.cards

    await act(() => result.current.moveCard(c.id, 'backlog', b.id))

    expect(titles(result.current.cards)).toEqual(['A', 'C', 'B'])
    expect(fake.rows().find(r => r.title === 'C')!.position).toBe(1.5)
  })

  it('can move a card to the top of its column', async () => {
    fake.seed([
      { title: 'A', position: 1 },
      { title: 'B', position: 2 },
    ])
    const { result } = await setup()
    const [a, b] = result.current.cards

    await act(() => result.current.moveCard(b.id, 'backlog', a.id))

    expect(titles(result.current.cards)).toEqual(['B', 'A'])
    expect(titles(fake.rows())).toEqual(['B', 'A'])
  })

  it('ignores a drop onto itself', async () => {
    fake.seed([{ title: 'A' }])
    const { result } = await setup()
    fake.calls().length = 0
    await act(() => result.current.moveCard(result.current.cards[0].id, 'backlog', result.current.cards[0].id))
    expect(fake.calls()).toEqual([])
  })

  it('reverts to what the database holds when the move fails', async () => {
    fake.seed([{ title: 'A', status: 'backlog' }])
    const { result } = await setup()
    fake.failNext('update', 'nope')

    await act(() => result.current.moveCard(result.current.cards[0].id, 'done'))

    await waitFor(() => expect(result.current.cards[0].status).toBe('backlog'))
    expect(result.current.error).toBe('nope')
  })
})

describe('deleting a card', () => {
  it('removes it immediately and from the database', async () => {
    fake.seed([{ title: 'A' }, { title: 'B', position: 2 }])
    const { result } = await setup()
    const a = result.current.cards[0]

    let removed: ReturnType<typeof result.current.deleteCard>
    await act(async () => { removed = result.current.deleteCard(a.id) })

    expect(titles(result.current.cards)).toEqual(['B'])
    expect(removed!).toMatchObject({ card: { title: 'A' }, position: 1 })
    await waitFor(() => expect(titles(fake.rows())).toEqual(['B']))
  })

  it('can be undone, putting the card back in the same spot', async () => {
    fake.seed([
      { title: 'A', position: 1 },
      { title: 'B', position: 2 },
      { title: 'C', position: 3 },
    ])
    const { result } = await setup()
    const b = result.current.cards[1]

    let removed: ReturnType<typeof result.current.deleteCard>
    await act(async () => { removed = result.current.deleteCard(b.id) })
    await act(() => result.current.restoreCard(removed!))

    expect(titles(result.current.cards)).toEqual(['A', 'B', 'C'])
    expect(titles(fake.rows())).toEqual(['A', 'B', 'C'])
    // it is a new row, so it has a new id
    expect(result.current.cards[1].id).not.toBe(b.id)
  })

  it('restores the card and shows the error when the delete fails', async () => {
    fake.seed([{ title: 'A' }])
    const { result } = await setup()
    fake.failNext('delete', 'cannot delete')

    await act(async () => { result.current.deleteCard(result.current.cards[0].id) })

    await waitFor(() => expect(result.current.error).toBe('cannot delete'))
    await waitFor(() => expect(titles(result.current.cards)).toEqual(['A']))
  })
})

describe('a card that is still saving', () => {
  it('ignores edits, moves and deletes until it has a real id', async () => {
    const { result } = await setup()
    const release = fake.holdNext('insert')
    act(() => { void result.current.addCard(input({ title: 'pending' }), 'backlog') })
    const tempId = result.current.cards[0].id
    fake.calls().length = 0

    await act(async () => {
      await result.current.updateCard(tempId, input({ title: 'edited' }))
      await result.current.moveCard(tempId, 'done')
      expect(result.current.deleteCard(tempId)).toBeUndefined()
    })

    expect(fake.calls().filter(c => c.op !== 'insert')).toEqual([])
    expect(result.current.cards[0]).toMatchObject({ title: 'pending', status: 'backlog' })
    release()
    await waitFor(() => expect(result.current.cards[0].id).toMatch(/^row-/))
  })
})
