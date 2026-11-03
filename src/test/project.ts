import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

// lets tests read the project's own files (SQL migrations, index.html, CSS) to lock in decisions
export const ROOT = resolve(import.meta.dirname, '../..')

export const read = (path: string) => readFileSync(join(ROOT, path), 'utf8')

export function walk(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap(name => {
    const path = `${dir}/${name}`
    return statSync(join(ROOT, path)).isDirectory() ? walk(path) : [path]
  })
}

/** WCAG relative luminance and contrast ratio for #rrggbb colours */
const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
