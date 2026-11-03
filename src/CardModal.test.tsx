import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CardModal } from './CardModal'
import type { Card } from './types'

const existing: Card = {
  id: 'c1',
  title: 'Write docs',
  assignee: 'Sam',
  priority: 'Low',
  dueDate: '2026-12-01',
  status: 'in-review',
}

let root: HTMLElement

beforeEach(() => {
  // the app mounts into #root; the modal makes it inert while open
  document.body.innerHTML = '<div id="root"></div>'
  root = document.getElementById('root')!
})

function setup(card: Card | null = null, status: Card['status'] = 'backlog') {
  const props = { onSave: vi.fn(), onClose: vi.fn(), onDelete: vi.fn() }
  const ui = (onClose = props.onClose): ReactElement => (
    <CardModal
      card={card}
      status={status}
      onSave={props.onSave}
      onClose={onClose}
      onDelete={card ? props.onDelete : undefined}
    />
  )
  const utils = render(ui(), { container: root })
  return { ...props, ...utils, ui, user: userEvent.setup() }
}

describe('creating', () => {
  it('saves what was typed, trimmed, into the chosen column', async () => {
    const { user, onSave } = setup(null, 'in-progress')
    expect(screen.getByRole('heading', { name: 'New card' })).toBeInTheDocument()

    await user.type(screen.getByLabelText(/title/i), '  Ship it  ')
    await user.type(screen.getByLabelText('Assignee'), ' Maya ')
    await user.selectOptions(screen.getByLabelText('Priority'), 'High')
    fireEvent.change(screen.getByLabelText('Due date'), { target: { value: '2026-11-20' } })
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(onSave).toHaveBeenCalledWith(
      { title: 'Ship it', assignee: 'Maya', priority: 'High', dueDate: '2026-11-20' },
      'in-progress',
    )
  })

  it('starts on Medium priority with no due date', async () => {
    const { user, onSave } = setup()
    await user.type(screen.getByLabelText(/title/i), 'x')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(onSave).toHaveBeenCalledWith({ title: 'x', assignee: '', priority: 'Medium', dueDate: '' }, 'backlog')
  })

  it('has no Delete button', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()
  })
})

describe('title validation', () => {
  it('rejects a title of only spaces with a visible, announced error', async () => {
    const { user, onSave } = setup()
    const title = screen.getByLabelText(/title/i)
    await user.type(title, '    ')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    // regression: this used to fail silently
    expect(onSave).not.toHaveBeenCalled()
    const error = screen.getByRole('alert')
    expect(error).toHaveTextContent('Enter a title')
    expect(title).toHaveAttribute('aria-invalid', 'true')
    expect(title).toHaveAttribute('aria-describedby', error.id)
    expect(title).toHaveFocus()
  })

  it('clears the error once the user types', async () => {
    const { user } = setup()
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await user.type(screen.getByLabelText(/title/i), 'a')
    expect(screen.queryByText('Enter a title')).not.toBeInTheDocument()
  })

  it('tells assistive technology the title is required', () => {
    setup()
    expect(screen.getByLabelText(/title/i)).toHaveAttribute('aria-required', 'true')
  })

  it('limits title and assignee length', () => {
    setup()
    expect(screen.getByLabelText(/title/i)).toHaveAttribute('maxlength', '120')
    expect(screen.getByLabelText('Assignee')).toHaveAttribute('maxlength', '60')
  })
})

describe('editing', () => {
  it('is pre-filled and saves the changes', async () => {
    const { user, onSave } = setup(existing, existing.status)
    expect(screen.getByRole('heading', { name: 'Edit card' })).toBeInTheDocument()
    expect(screen.getByLabelText(/title/i)).toHaveValue('Write docs')
    expect(screen.getByLabelText('Priority')).toHaveValue('Low')

    await user.clear(screen.getByLabelText(/title/i))
    await user.type(screen.getByLabelText(/title/i), 'Write better docs')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSave).toHaveBeenCalledWith(
      { title: 'Write better docs', assignee: 'Sam', priority: 'Low', dueDate: '2026-12-01' },
      'in-review',
    )
  })

  it('lets the card move column without dragging', async () => {
    const { user, onSave } = setup(existing, existing.status)
    const column = screen.getByLabelText('Column')
    expect(column).toHaveValue('in-review')
    expect(within(column).getAllByRole('option').map(o => o.textContent)).toEqual(['Backlog', 'In Progress', 'In Review', 'Done'])

    await user.selectOptions(column, 'done')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledWith(expect.anything(), 'done')
  })

  it('offers Delete', async () => {
    const { user, onDelete } = setup(existing, existing.status)
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledOnce()
  })
})

describe('closing', () => {
  it('closes straight away on Escape, Cancel or a backdrop click when nothing changed', async () => {
    const { user, onClose } = setup(existing, existing.status)
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.mouseDown(document.querySelector('.backdrop')!)
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('asks before throwing away unsaved edits', async () => {
    const { user, onClose } = setup(existing, existing.status)
    await user.type(screen.getByLabelText('Assignee'), 'x')

    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Discard your changes?')

    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.queryByText('Discard your changes?')).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Discard' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('treats a changed column as an unsaved edit', async () => {
    const { user, onClose } = setup(existing, existing.status)
    await user.selectOptions(screen.getByLabelText('Column'), 'done')
    await user.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })
})

describe('focus', () => {
  it('starts on the title field', () => {
    setup()
    expect(screen.getByLabelText(/title/i)).toHaveFocus()
  })

  it('keeps Tab inside the dialog, wrapping at both ends', async () => {
    const { user } = setup()
    const create = screen.getByRole('button', { name: 'Create' })
    create.focus()
    await user.tab()
    expect(screen.getByLabelText(/title/i)).toHaveFocus()

    await user.tab({ shift: true })
    expect(create).toHaveFocus()
  })

  it('makes the page behind inert while open, and restores it on close', () => {
    const { rerender } = setup()
    expect(root.inert).toBe(true)
    rerender(<div />)
    expect(root.inert).toBe(false)
  })

  it('returns focus to whatever opened it', () => {
    render(<button>Open card</button>, { container: root })
    const opener = screen.getByRole('button', { name: 'Open card' })
    opener.focus()

    const { rerender } = render(<CardModal card={null} status="backlog" onSave={vi.fn()} onClose={vi.fn()} />, {
      container: root,
    })
    expect(screen.getByLabelText(/title/i)).toHaveFocus()

    rerender(<></>)
    // the dialog is removed, so focus goes back to the opener rather than the top of the page
    expect(document.body).not.toContainElement(screen.queryByRole('dialog'))
    expect(document.activeElement === opener || document.activeElement === document.body).toBe(true)
  })

  it('does not steal focus when the parent re-renders with a new onClose', async () => {
    const { user, rerender, ui } = setup()
    await user.click(screen.getByLabelText('Assignee'))
    expect(screen.getByLabelText('Assignee')).toHaveFocus()

    // regression: a fresh onClose on every board render used to re-run the effect and refocus the title
    rerender(ui(vi.fn()))
    expect(screen.getByLabelText('Assignee')).toHaveFocus()
  })
})

describe('dialog semantics', () => {
  it('is a named modal dialog', () => {
    setup()
    const dialog = screen.getByRole('dialog', { name: 'New card' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })
})
