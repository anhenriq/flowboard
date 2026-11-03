import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Card } from './Card'
import type { Card as CardType } from './types'

const base: CardType = {
  id: 'c1',
  title: 'Fix mobile nav',
  assignee: '',
  priority: 'None',
  dueDate: '',
  status: 'backlog',
}

function setup(card: Partial<CardType> = {}) {
  const handlers = {
    onDragStart: vi.fn(),
    onDragEnd: vi.fn(),
    onDragOver: vi.fn(),
    onDrop: vi.fn(),
    onEdit: vi.fn(),
    onKeyMove: vi.fn(),
  }
  const utils = render(<Card card={{ ...base, ...card }} dragging={false} {...handlers} />)
  return { ...utils, ...handlers, button: screen.getByRole('button') }
}

describe('Card', () => {
  it('shows the title, priority, due date and assignee', () => {
    setup({ priority: 'High', dueDate: '2026-11-08', assignee: 'Maya' })
    expect(screen.getByText('Fix mobile nav')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText(/Nov 8/)).toBeInTheDocument()
    expect(screen.getByText('Maya')).toBeInTheDocument()
  })

  it('hides the priority badge for "None"', () => {
    setup({ priority: 'None' })
    expect(screen.queryByText('None')).not.toBeInTheDocument()
  })

  it('gives screen readers one summary label', () => {
    const { button } = setup({ priority: 'High', dueDate: '2026-11-08', assignee: 'Maya' })
    expect(button).toHaveAccessibleName(/Fix mobile nav, High priority, due Nov 8, assigned to Maya/)
  })

  it('hides the decorative person icon from assistive technology', () => {
    const { container } = setup({ assignee: 'Maya' })
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  describe('overdue dates', () => {
    // 11:30pm on 3 Nov in Arizona (UTC-7) is already 4 Nov in UTC
    const lateEvening = new Date(2026, 10, 3, 23, 30)

    it('does not flag a card due today, even late in the evening', () => {
      vi.useFakeTimers({ now: lateEvening })
      const { button } = setup({ dueDate: '2026-11-03' })
      // regression: comparing against the UTC date used to mark today's cards overdue
      expect(button).not.toHaveAccessibleName(/overdue/)
    })

    it('flags a card whose due date was yesterday', () => {
      vi.useFakeTimers({ now: lateEvening })
      const { button } = setup({ dueDate: '2026-11-02' })
      expect(button).toHaveAccessibleName(/overdue, due Nov 2/)
      // not only colour: there is text for screen readers and a marker for sighted users
      expect(screen.getByText('Overdue:')).toHaveClass('sr-only')
      expect(button.querySelector('.due')).toHaveClass('overdue')
    })

    it('never flags a finished card', () => {
      vi.useFakeTimers({ now: lateEvening })
      const { button } = setup({ dueDate: '2026-10-01', status: 'done' })
      expect(button).not.toHaveAccessibleName(/overdue/)
    })
  })

  describe('keyboard', () => {
    it('opens on Enter and on Space', () => {
      const { button, onEdit } = setup()
      fireEvent.keyDown(button, { key: 'Enter' })
      fireEvent.keyDown(button, { key: ' ' })
      expect(onEdit).toHaveBeenCalledTimes(2)
    })

    it('stops Space from scrolling the page', () => {
      const { button } = setup()
      const notPrevented = fireEvent.keyDown(button, { key: ' ' })
      expect(notPrevented).toBe(false)
    })

    it('opens on click', () => {
      const { button, onEdit } = setup()
      fireEvent.click(button)
      expect(onEdit).toHaveBeenCalledOnce()
    })

    it.each([
      ['ArrowUp', 'up'],
      ['ArrowDown', 'down'],
      ['ArrowLeft', 'left'],
      ['ArrowRight', 'right'],
    ])('reports a move %s with Alt held', (key, direction) => {
      const { button, onKeyMove } = setup()
      fireEvent.keyDown(button, { key, altKey: true })
      expect(onKeyMove).toHaveBeenCalledWith(direction)
    })

    it('ignores plain arrow keys', () => {
      const { button, onKeyMove } = setup()
      fireEvent.keyDown(button, { key: 'ArrowRight' })
      expect(onKeyMove).not.toHaveBeenCalled()
    })

    it('can be focused with Tab', () => {
      const { button } = setup()
      expect(button).toHaveAttribute('tabindex', '0')
    })
  })
})
