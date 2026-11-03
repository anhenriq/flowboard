import { describe, expect, it } from 'vitest'
import { read, walk } from '../test/project'

const migrations = walk('supabase/migrations').filter(f => f.endsWith('.sql')).sort()
const sql = migrations.map(read).join('\n').toLowerCase()

describe('database: row level security', () => {
  it('has migrations checked in', () => {
    expect(migrations.length).toBeGreaterThan(0)
  })

  it('enables RLS on every table the migrations create', () => {
    const tables = [...sql.matchAll(/create table (?:if not exists )?public\.(\w+)/g)].map(m => m[1])
    expect(tables).toContain('cards')
    for (const table of tables) {
      expect(sql, `RLS missing for public.${table}`).toContain(`alter table public.${table} enable row level security`)
    }
  })

  it('has one owner-only policy for each of select, insert, update and delete on cards', () => {
    const policies = [...sql.matchAll(/create policy "([^"]+)" on public\.cards\s+for (\w+)([\s\S]*?);/g)]
    expect(policies.map(p => p[2]).sort()).toEqual(['delete', 'insert', 'select', 'update'])
    for (const [, name, , body] of policies) {
      expect(body, `${name}: signed-in users only`).toContain('to authenticated')
      expect(body, `${name}: tied to the owner`).toContain('auth.uid()')
      expect(body, `${name}: must not be open to everyone`).not.toMatch(/\(true\)|to anon|to public/)
    }
  })

  it('stops a user changing a card to belong to someone else', () => {
    const update = sql.match(/create policy "[^"]+" on public\.cards\s+for update([\s\S]*?);/)![1]
    expect(update).toContain('using')
    expect(update).toContain('with check')
  })

  it('takes TRUNCATE (which bypasses RLS) and other unneeded privileges away', () => {
    expect(sql).toMatch(/revoke truncate, references, trigger on public\.cards from anon, authenticated/)
    expect(sql).toMatch(/revoke all on public\.cards from anon/)
  })

  it('enforces the title and assignee length limits on the server', () => {
    expect(sql).toContain('char_length(title) <= 120')
    expect(sql).toContain('char_length(assignee) <= 60')
  })
})

describe('front end', () => {
  const source = walk('src')
    .filter(f => /\.tsx?$/.test(f) && !f.includes('.test.') && !f.startsWith('src/test/'))
    .map(f => [f, read(f)] as const)

  it('never uses the admin key, raw HTML injection, eval or browser storage', () => {
    expect(source.length).toBeGreaterThan(5)
    for (const [file, text] of source) {
      expect(text, file).not.toMatch(/service_role|dangerouslySetInnerHTML|\.innerHTML|\beval\(|localStorage|sessionStorage/)
    }
  })

  it('keeps secrets files out of git and the example file empty', () => {
    expect(read('.gitignore')).toMatch(/^\*\.local$/m)
    for (const line of read('.env.example').split('\n').filter(l => /^VITE_\w+=/.test(l))) {
      expect(line, 'no real value in .env.example').toMatch(/^VITE_\w+=$/)
    }
  })

  it('only ever references the publishable key', () => {
    for (const [file, text] of source) {
      expect(text, file).not.toMatch(/SECRET|SERVICE_ROLE/i)
    }
  })
})
