import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ErrorBoundary, Fatal } from './Fatal'

function Boom(): never {
  throw new Error('render failed')
}

describe('Fatal', () => {
  it('announces its message', () => {
    render(<Fatal title="Not configured"><p>Details</p></Fatal>)
    expect(screen.getByRole('alert')).toHaveTextContent('Not configured')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Not configured')
  })
})

describe('ErrorBoundary', () => {
  it('shows a friendly message with a reload button instead of a blank page', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ErrorBoundary><Boom /></ErrorBoundary>)
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
  })

  it('renders children normally when nothing fails', () => {
    render(<ErrorBoundary><p>fine</p></ErrorBoundary>)
    expect(screen.getByText('fine')).toBeInTheDocument()
  })
})
