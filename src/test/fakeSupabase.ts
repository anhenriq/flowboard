import { vi } from 'vitest'

// An in-memory stand-in for the Supabase client, so tests never reach a real database.
// It supports exactly the calls the app makes:
//   from('cards').select(cols).order(col)
//   from('cards').insert(values).select(cols).single()
//   from('cards').update(values).eq(col, val)
//   from('cards').delete().eq(col, val)

export interface Row {
  id: string
  title: string
  assignee: string
  priority: string
  due_date: string | null
  status: string
  position: number
}

type Op = 'select' | 'insert' | 'update' | 'delete'
type Result = { data: unknown; error: { message: string } | null }

export interface Call {
  op: Op
  values?: Record<string, unknown>
  id?: string
}

function createFake() {
  let rows: Row[] = []
  let seq = 0
  let calls: Call[] = []
  let failures: Partial<Record<Op, string>> = {}
  let holds: Partial<Record<Op, Promise<void>>> = {}

  const execute = async (state: {
    op: Op
    values?: Record<string, unknown>
    id?: string
    single: boolean
  }): Promise<Result> => {
    calls.push({ op: state.op, values: state.values, id: state.id })

    const hold = holds[state.op]
    if (hold) {
      delete holds[state.op]
      await hold
    }
    const failure = failures[state.op]
    if (failure) {
      delete failures[state.op]
      return { data: null, error: { message: failure } }
    }

    switch (state.op) {
      case 'select':
        return { data: [...rows].sort((a, b) => a.position - b.position), error: null }
      case 'insert': {
        const row: Row = {
          id: `row-${++seq}`,
          assignee: '',
          priority: 'Medium',
          due_date: null,
          status: 'backlog',
          position: 0,
          title: '',
          ...state.values,
        }
        rows.push(row)
        return { data: state.single ? row : [row], error: null }
      }
      case 'update':
        rows = rows.map(r => (r.id === state.id ? { ...r, ...state.values } : r))
        return { data: null, error: null }
      case 'delete':
        rows = rows.filter(r => r.id !== state.id)
        return { data: null, error: null }
    }
  }

  // chainable and awaitable, like the real query builder
  const query = (op: Op, values?: Record<string, unknown>) => {
    const state = { op, values, id: undefined as string | undefined, single: false }
    const builder = {
      select: () => builder,
      order: () => builder,
      single: () => { state.single = true; return builder },
      eq: (_column: string, value: string) => { state.id = value; return builder },
      then: (resolve: (r: Result) => unknown, reject?: (e: unknown) => unknown) =>
        execute(state).then(resolve, reject),
    }
    return builder
  }

  const auth = {
    getSession: vi.fn(async () => ({ data: { session: null as unknown } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signInWithPassword: vi.fn(async () => ({ error: null as { message: string } | null })),
    signUp: vi.fn(async () => ({ data: { session: null as unknown }, error: null as { message: string } | null })),
    signOut: vi.fn(async () => ({ error: null })),
  }

  const client = {
    auth,
    from: (table: string) => {
      if (table !== 'cards') throw new Error(`fake supabase: unexpected table "${table}"`)
      return {
        select: () => query('select'),
        insert: (values: Record<string, unknown>) => query('insert', values),
        update: (values: Record<string, unknown>) => query('update', values),
        delete: () => query('delete'),
      }
    },
  }

  const makeAuthDefaults = () => {
    auth.getSession.mockImplementation(async () => ({ data: { session: null } }))
    auth.onAuthStateChange.mockImplementation(() => ({ data: { subscription: { unsubscribe: vi.fn() } } }))
    auth.signInWithPassword.mockImplementation(async () => ({ error: null }))
    auth.signUp.mockImplementation(async () => ({ data: { session: null }, error: null }))
    auth.signOut.mockImplementation(async () => ({ error: null }))
  }

  return {
    client,
    auth,
    /** put rows in the table; missing fields get the same defaults the database has */
    seed(input: Partial<Row>[]) {
      rows = input.map(r => ({
        id: `row-${++seq}`,
        title: 'Card',
        assignee: '',
        priority: 'Medium',
        due_date: null,
        status: 'backlog',
        position: 1,
        ...r,
      }))
    },
    /** what is currently stored, in position order */
    rows: () => [...rows].sort((a, b) => a.position - b.position),
    /** every query the app has made, in order */
    calls: () => calls,
    /** make the next call of this kind fail once, like a network or permission error */
    failNext(op: Op, message = 'boom') {
      failures[op] = message
    },
    /** keep the next call of this kind pending until the returned function is called */
    holdNext(op: Op) {
      let release!: () => void
      holds[op] = new Promise<void>(resolve => { release = resolve })
      return release
    },
    reset() {
      rows = []
      seq = 0
      calls = []
      failures = {}
      holds = {}
      makeAuthDefaults()
    },
  }
}

export const fake = createFake()
