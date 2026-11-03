import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Card, CardInput, Status } from './types'
import { COLUMNS, PRIORITIES } from './types'

interface Props {
  card: Card | null // null = creating a new card
  status: Status // column the card is in, or will be created in
  onSave: (input: CardInput, status: Status) => void
  onDelete?: () => void
  onClose: () => void
}

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

export function CardModal({ card, status: initialStatus, onSave, onDelete, onClose }: Props) {
  const [title, setTitle] = useState(card?.title ?? '')
  const [assignee, setAssignee] = useState(card?.assignee ?? '')
  const [priority, setPriority] = useState(card?.priority ?? 'Medium')
  const [dueDate, setDueDate] = useState(card?.dueDate ?? '')
  const [status, setStatus] = useState<Status>(initialStatus)
  const [titleError, setTitleError] = useState('')
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const dirty =
    title !== (card?.title ?? '') ||
    assignee !== (card?.assignee ?? '') ||
    priority !== (card?.priority ?? 'Medium') ||
    dueDate !== (card?.dueDate ?? '') ||
    status !== initialStatus

  // closing with unsaved edits asks first, instead of silently throwing them away
  const requestClose = useCallback(() => {
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }, [dirty, onClose])

  // keep the latest handler in a ref so the listener below isn't re-attached on every keystroke
  const requestCloseRef = useRef(requestClose)
  useEffect(() => { requestCloseRef.current = requestClose })

  useEffect(() => {
    // remember what opened the dialog so focus can go back there, and make the page behind inert
    const opener = document.activeElement as HTMLElement | null
    const root = document.getElementById('root')
    if (root) root.inert = true
    titleRef.current?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        requestCloseRef.current()
      } else if (e.key === 'Tab' && formRef.current) {
        // keep Tab inside the dialog
        const items = [...formRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)]
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (root) root.inert = false
      // the opener may have been re-rendered or removed (a deleted card), so check it's still there
      if (opener && document.contains(opener)) opener.focus()
    }
  }, [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setTitleError('Enter a title')
      titleRef.current?.focus()
      return
    }
    onSave({ title: title.trim(), assignee: assignee.trim(), priority, dueDate }, status)
  }

  return createPortal(
    <div className="backdrop" onMouseDown={e => e.target === e.currentTarget && requestClose()}>
      <form
        ref={formRef}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onSubmit={submit}
      >
        <h2 id="modal-title">{card ? 'Edit card' : 'New card'}</h2>

        <label>
          Title <span className="sr-only">(required)</span>
          <input
            ref={titleRef}
            value={title}
            maxLength={120}
            aria-required="true"
            aria-invalid={titleError ? true : undefined}
            aria-describedby={titleError ? 'title-error' : undefined}
            onChange={e => { setTitle(e.target.value); setTitleError('') }}
          />
          {titleError && <span id="title-error" className="field-error" role="alert">{titleError}</span>}
        </label>
        <label>
          Assignee
          <input value={assignee} maxLength={60} onChange={e => setAssignee(e.target.value)} />
        </label>
        <div className="row">
          <label>
            Column
            <select value={status} onChange={e => setStatus(e.target.value as Status)}>
              {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </label>
          <label>
            Priority
            <select value={priority} onChange={e => setPriority(e.target.value as Card['priority'])}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </label>
        </div>
        <label>
          Due date
          <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} />
        </label>

        {confirmDiscard && (
          <div className="discard" role="alert">
            <span>Discard your changes?</span>
            <span className="spacer" />
            <button type="button" onClick={() => setConfirmDiscard(false)}>Keep editing</button>
            <button type="button" onClick={onClose}>Discard</button>
          </div>
        )}

        <div className="actions">
          {onDelete && (
            <button type="button" className="danger" onClick={onDelete}>Delete</button>
          )}
          <span className="spacer" />
          <button type="button" onClick={requestClose}>Cancel</button>
          <button type="submit" className="primary">{card ? 'Save' : 'Create'}</button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
