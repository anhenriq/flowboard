import { describe, expect, it } from 'vitest'
import { contrast, read } from '../test/project'

const css = read('src/index.css')

const tokens = (block: string) =>
  Object.fromEntries([...block.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6})/gi)].map(m => [m[1], m[2]]))

const light = tokens(css.match(/:root\s*\{([^}]*)\}/)![1])
const dark = { ...light, ...tokens(css.match(/prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]*)\}/)![1]) }

describe.each([
  ['light', light],
  ['dark', dark],
])('colour contrast (WCAG 1.4.3, 4.5:1) in %s mode', (_name, t) => {
  const pairs: [string, string, string][] = [
    ['muted text on a column', 'muted', 'column'],
    ['muted text on a card', 'muted', 'surface'],
    ['body text on a card', 'text', 'surface'],
    ['button text on the accent colour', 'on-accent', 'accent'],
    ['error text on the page', 'danger', 'bg'],
    ['error text on a card', 'danger', 'surface'],
    ['high priority badge on a card', 'high', 'surface'],
    ['medium priority badge on a card', 'medium', 'surface'],
    ['low priority badge on a card', 'low', 'surface'],
  ]

  it.each(pairs)('%s', (_label, fg, bg) => {
    expect(t[fg], `--${fg} defined`).toBeDefined()
    expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5)
  })

  it('keeps the focus colour visible against columns (3:1 for UI components)', () => {
    expect(contrast(t.accent, t.column)).toBeGreaterThanOrEqual(3)
  })
})

describe('stylesheet', () => {
  it('shows a strong focus ring on cards instead of removing the outline', () => {
    expect(css).toMatch(/\.card:focus-visible\s*\{[^}]*outline:\s*3px solid/)
  })

  it('has a visually-hidden helper for screen-reader-only text', () => {
    expect(css).toMatch(/\.sr-only\s*\{[^}]*clip-path/)
  })

  it('respects reduced-motion preferences', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)/)
  })

  it('sizes text in rem so it follows the browser font setting', () => {
    for (const token of ['--text-sm', '--text-md', '--text-lg', '--text-xl']) {
      expect(css).toMatch(new RegExp(`${token}:\\s*[\\d.]+rem`))
    }
  })

  it('keeps small buttons at least 24px tall (WCAG 2.5.8)', () => {
    expect(css).toMatch(/\.add,[^{]*\.toast button\s*\{\s*min-height:\s*(2[4-9]|[3-9]\d)px/)
  })

  it('supports dark mode', () => {
    expect(css).toContain('prefers-color-scheme: dark')
  })
})
