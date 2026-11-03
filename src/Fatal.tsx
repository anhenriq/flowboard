import { Component } from 'react'
import type { ReactNode } from 'react'

export function Fatal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="fatal" role="alert">
      <h1>{title}</h1>
      {children}
    </div>
  )
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <Fatal title="Something went wrong">
        <p>FlowBoard hit an unexpected error.</p>
        <button onClick={() => location.reload()}>Reload</button>
      </Fatal>
    )
  }
}
