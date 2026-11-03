import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Board } from './Board'
import { fake } from './test/fakeSupabase'

vi.mock('./supabase', async () => {
  const { fake } = await import('./test/fakeSupabase')
  return { supabase: fake.client, supabaseConfigured: true }
})

async function setup() {
  const utils = render(<Board />)
  await waitFor(() => expect(screen.queryByText('Loading cards…')).not.toBeInTheDocument())
  return { ...utils, user: userEvent.setup() }
}

const column = (name: string) => screen.getByRole('region', { name })
const cardsIn = (name: string) => within(column(name)).queryAllByRole('button', { name: /^(?!\+ Add card)/ }).filter(b => b.classList.contains('card'))
const cardTitles = (name: string) => cardsIn(name).map(c => c.querySelector('.card-title')!.textContent)
const card = (title: string) => screen.getByRole('button', { name: new RegExp(`^${title}`) })

// a stand-in for the browser's drag data, which jsdom does not provide
const dataTransfer = () => {
  const data: Record<string, string> = {}
  return { setData: (k: string, v: string) => { data[k] = v }, getData: (k: string) => data[k], effectAllowed: '' }
}

describe('first run', () => {
  it('welcomes a new user and creates their first card in Backlog', async () => {
    const { user } = await setup()
    expect(screen.getByRole('heading', { name: 'Welcome to FlowBoard' })).toBeInTheDocument()
    expect(within(column('Backlog')).getByText('No cards here yet')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Create your first card' }))
    await user.type(screen.getByRole('textbox', { name: /^title/i }), 'My first card')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(cardTitles('Backlog')).toEqual(['My first card']))
    expect(screen.queryByRole('heading', { name: 'Welcome to FlowBoard' })).not.toBeInTheDocument()
    await waitFor(() => expect(fake.rows()).toHaveLength(1))
  })

  it('announces loading politely', async () => {
    const release = fake.holdNext('select')
    render(<Board />)
    expect(screen.getByText('Loading cards…')).toHaveAttribute('role', 'status')
    release()
    await waitFor(() => expect(screen.queryByText('Loading cards…')).not.toBeInTheDocument())
  })
})

describe('creating', () => {
  it('adds a card to the column whose button was used', async () => {
    fake.seed([{ title: 'Existing', status: 'backlog' }])
    const { user } = await setup()

    await user.click(screen.getByRole('button', { name: /add card to in review/i }))
    expect(screen.getByLabelText('Column')).toHaveValue('in-review')
    await user.type(screen.getByRole('textbox', { name: /^title/i }), 'Review PR')
    await user.selectOptions(screen.getByLabelText('Priority'), 'High')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => expect(cardTitles('In Review')).toEqual(['Review PR']))
    await waitFor(() => expect(fake.rows().find(r => r.title === 'Review PR')).toMatchObject({ status: 'in-review', priority: 'High' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows column counts for screen readers', async () => {
    fake.seed([{ status: 'done' }, { status: 'done', position: 2 }])
    await setup()
    expect(within(column('Done')).getByText('2', { exact: false })).toHaveTextContent('2 cards')
  })
})

describe('editing', () => {
  it('opens a card, saves changes and shows them on the board', async () => {
    fake.seed([{ title: 'Old title', assignee: 'Sam', priority: 'Low' }])
    const { user } = await setup()

    await user.click(card('Old title'))
    const title = screen.getByRole('textbox', { name: /^title/i })
    await user.clear(title)
    await user.type(title, 'New title')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(cardTitles('Backlog')).toEqual(['New title']))
    await waitFor(() => expect(fake.rows()[0].title).toBe('New title'))
  })

  it('opens from the keyboard', async () => {
    fake.seed([{ title: 'Keyboard card' }])
    const { user } = await setup()
    card('Keyboard card').focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('dialog', { name: 'Edit card' })).toBeInTheDocument()
  })

  it('moves a card to another column from the dialog', async () => {
    fake.seed([{ title: 'Movable', status: 'backlog' }])
    const { user } = await setup()

    await user.click(card('Movable'))
    await user.selectOptions(screen.getByLabelText('Column'), 'done')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => expect(cardTitles('Done')).toEqual(['Movable']))
    expect(cardTitles('Backlog')).toEqual([])
    await waitFor(() => expect(fake.rows()[0].status).toBe('done'))
    expect(screen.getByText('Moved Movable to Done')).toBeInTheDocument()
  })
})

describe('moving', () => {
  it('moves a dragged card into another column', async () => {
    fake.seed([{ title: 'Dragged', status: 'backlog' }])
    await setup()
    const dt = dataTransfer()

    fireEvent.dragStart(card('Dragged'), { dataTransfer: dt })
    fireEvent.dragOver(column('In Progress'), { dataTransfer: dt })
    fireEvent.drop(column('In Progress'), { dataTransfer: dt })

    await waitFor(() => expect(cardTitles('In Progress')).toEqual(['Dragged']))
    await waitFor(() => expect(fake.rows()[0].status).toBe('in-progress'))
  })

  it('drops a card before the one it lands on', async () => {
    fake.seed([
      { title: 'First', position: 1 },
      { title: 'Second', position: 2 },
    ])
    await setup()
    const dt = dataTransfer()

    fireEvent.dragStart(card('Second'), { dataTransfer: dt })
    fireEvent.drop(card('First'), { dataTransfer: dt })

    await waitFor(() => expect(cardTitles('Backlog')).toEqual(['Second', 'First']))
  })

  it('clears the dimmed state after a drop so the card is not stuck faded', async () => {
    fake.seed([{ title: 'Dragged' }])
    await setup()
    const dt = dataTransfer()
    fireEvent.dragStart(card('Dragged'), { dataTransfer: dt })
    expect(card('Dragged')).toHaveClass('dragging')

    fireEvent.drop(column('Done'), { dataTransfer: dt })
    await waitFor(() => expect(cardTitles('Done')).toEqual(['Dragged']))
    expect(card('Dragged')).not.toHaveClass('dragging')
  })

  it('moves a card to the next column with Alt+Right and keeps focus on it', async () => {
    fake.seed([{ title: 'Keyed', status: 'backlog' }])
    const { user } = await setup()
    card('Keyed').focus()

    await user.keyboard('{Alt>}{ArrowRight}{/Alt}')

    await waitFor(() => expect(cardTitles('In Progress')).toEqual(['Keyed']))
    await waitFor(() => expect(card('Keyed')).toHaveFocus())
    expect(screen.getByText(/Moved Keyed to In Progress, position 1 of 1/)).toBeInTheDocument()
    await waitFor(() => expect(fake.rows()[0].status).toBe('in-progress'))
  })

  it('reorders within a column with Alt+Up and Alt+Down', async () => {
    fake.seed([
      { title: 'One', position: 1 },
      { title: 'Two', position: 2 },
      { title: 'Three', position: 3 },
    ])
    const { user } = await setup()

    card('One').focus()
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    await waitFor(() => expect(cardTitles('Backlog')).toEqual(['Two', 'One', 'Three']))
    expect(screen.getByText(/Moved One to position 2 of 3 in Backlog/)).toBeInTheDocument()

    await waitFor(() => expect(card('One')).toHaveFocus())
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    await waitFor(() => expect(cardTitles('Backlog')).toEqual(['One', 'Two', 'Three']))
  })

  it('says so, instead of silently doing nothing, at the edges', async () => {
    fake.seed([{ title: 'Edge', status: 'backlog' }])
    const { user } = await setup()
    card('Edge').focus()

    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect(screen.getByText('Edge is already first in Backlog')).toBeInTheDocument()
    await user.keyboard('{Alt>}{ArrowLeft}{/Alt}')
    expect(screen.getByText('Edge is already in the first column')).toBeInTheDocument()
    expect(cardTitles('Backlog')).toEqual(['Edge'])
  })

  it('exposes a polite live region for those messages', async () => {
    await setup()
    const live = document.querySelector('[aria-live="polite"]')
    expect(live).toHaveAttribute('role', 'status')
    expect(live).toHaveClass('sr-only')
  })
})

describe('deleting', () => {
  it('removes the card, offers Undo, and Undo brings it back', async () => {
    fake.seed([{ title: 'Doomed' }])
    const { user } = await setup()

    await user.click(card('Doomed'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(cardTitles('Backlog')).toEqual([])
    expect(screen.getByText('Deleted “Doomed”')).toBeInTheDocument()
    await waitFor(() => expect(fake.rows()).toHaveLength(0))

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(cardTitles('Backlog')).toEqual(['Doomed']))
    await waitFor(() => expect(fake.rows().map(r => r.title)).toEqual(['Doomed']))
    expect(screen.queryByText('Deleted “Doomed”')).not.toBeInTheDocument()
  })

  it('does not use a blocking browser confirm dialog', async () => {
    const confirm = vi.spyOn(window, 'confirm')
    fake.seed([{ title: 'Doomed' }])
    const { user } = await setup()
    await user.click(card('Doomed'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(confirm).not.toHaveBeenCalled()
  })

  describe('the Undo toast timer', () => {
    async function deleteWithFakeTimers() {
      vi.useFakeTimers({ shouldAdvanceTime: true })
      fake.seed([{ title: 'Doomed' }])
      const utils = render(<Board />)
      const user = userEvent.setup({ advanceTimers: ms => vi.advanceTimersByTime(ms) })
      await waitFor(() => expect(screen.queryByText('Loading cards…')).not.toBeInTheDocument())
      await user.click(card('Doomed'))
      await user.click(screen.getByRole('button', { name: 'Delete' }))
      return { ...utils, user, toast: screen.getByText('Deleted “Doomed”').parentElement! }
    }

    it('goes away after 10 seconds', async () => {
      await deleteWithFakeTimers()
      act(() => { vi.advanceTimersByTime(9_500) })
      expect(screen.getByText('Deleted “Doomed”')).toBeInTheDocument()
      act(() => { vi.advanceTimersByTime(1_000) })
      expect(screen.queryByText('Deleted “Doomed”')).not.toBeInTheDocument()
    })

    it('waits while the user is hovering over it', async () => {
      const { toast } = await deleteWithFakeTimers()
      fireEvent.mouseEnter(toast)
      act(() => { vi.advanceTimersByTime(60_000) })
      expect(screen.getByText('Deleted “Doomed”')).toBeInTheDocument()

      fireEvent.mouseLeave(toast)
      act(() => { vi.advanceTimersByTime(10_500) })
      expect(screen.queryByText('Deleted “Doomed”')).not.toBeInTheDocument()
    })

    it('waits while a button in it has keyboard focus', async () => {
      const { toast } = await deleteWithFakeTimers()
      fireEvent.focus(toast)
      act(() => { vi.advanceTimersByTime(60_000) })
      expect(screen.getByText('Deleted “Doomed”')).toBeInTheDocument()
    })
  })
})

describe('errors', () => {
  it('keeps a failed-save message on screen, then lets it be dismissed', async () => {
    fake.seed([{ title: 'Fragile' }])
    const { user } = await setup()
    fake.failNext('update', 'Could not save')

    await user.click(card('Fragile'))
    await user.type(screen.getByLabelText('Assignee'), 'Maya')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const banner = await screen.findByRole('alert')
    expect(banner).toHaveTextContent('Could not save')
    // wait for the resync that follows a failure; the message must outlive it
    await waitFor(() => expect(fake.calls().filter(c => c.op === 'select')).toHaveLength(2))
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save')

    await user.click(screen.getByRole('button', { name: 'Dismiss error' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('offers Retry when the board could not load, and loads on retry', async () => {
    fake.failNext('select', 'Network down')
    const { user } = await setup()
    expect(screen.getByRole('alert')).toHaveTextContent('Network down')
    // an error is not the same as an empty board, so the welcome panel stays hidden
    expect(screen.queryByRole('heading', { name: 'Welcome to FlowBoard' })).not.toBeInTheDocument()

    fake.seed([{ title: 'Back online' }])
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(cardTitles('Backlog')).toEqual(['Back online']))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('structure', () => {
  it('labels the board landmark so the skip link can target it', async () => {
    await setup()
    const board = screen.getByRole('main')
    expect(board).toHaveAttribute('id', 'board')
  })

  it('shows one column region per status with a heading each', async () => {
    await setup()
    for (const name of ['Backlog', 'In Progress', 'In Review', 'Done']) {
      expect(within(column(name)).getByRole('heading', { level: 2, name })).toBeInTheDocument()
    }
  })
})
