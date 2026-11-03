import { describe, expect, it, vi } from 'vitest'
import { read, ROOT } from '../test/project'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import viteConfig from '../../vite.config'

const html = new DOMParser().parseFromString(read('index.html'), 'text/html')
const meta = (selector: string) => html.querySelector(selector)?.getAttribute('content') ?? ''

describe('index.html', () => {
  it('has a descriptive title of a sensible length', () => {
    expect(html.title).toMatch(/FlowBoard/)
    expect(html.title).not.toBe('FlowBoard')
    expect(html.title.length).toBeLessThanOrEqual(60)
  })

  it('has a meta description of a sensible length', () => {
    const description = meta('meta[name="description"]')
    expect(description.length).toBeGreaterThanOrEqual(50)
    expect(description.length).toBeLessThanOrEqual(160)
  })

  it('declares its language and a zoomable viewport', () => {
    expect(html.documentElement.lang).toBe('en')
    expect(meta('meta[name="viewport"]')).not.toMatch(/user-scalable\s*=\s*no|maximum-scale\s*=\s*1(\.0)?\b/)
  })

  it('has Open Graph and Twitter tags', () => {
    for (const property of ['og:type', 'og:site_name', 'og:title', 'og:description']) {
      expect(meta(`meta[property="${property}"]`), property).not.toBe('')
    }
    expect(meta('meta[name="twitter:title"]')).not.toBe('')
    expect(meta('meta[name="twitter:description"]')).not.toBe('')
  })

  it('allows indexing', () => {
    expect(meta('meta[name="robots"]')).toMatch(/\bindex\b/)
    expect(meta('meta[name="robots"]')).not.toMatch(/noindex/)
  })

  it('has real content inside #root for crawlers that do not run JavaScript', () => {
    const root = html.getElementById('root')!
    expect(root.querySelector('main h1')?.textContent).toBe('FlowBoard')
    expect(root.textContent!.length).toBeGreaterThan(100)
    expect(html.querySelector('noscript')?.textContent).toMatch(/JavaScript/)
  })

  it('leaves the CSP out of the source file, since dev needs inline scripts (it is added at build)', () => {
    expect(html.querySelector('meta[http-equiv="Content-Security-Policy"]')).toBeNull()
  })
})

describe('public files', () => {
  it('robots.txt lets everyone in and never blocks the whole site', () => {
    const robots = read('public/robots.txt')
    expect(robots).toMatch(/User-agent: \*\s+Allow: \//)
    expect(robots).not.toMatch(/^Disallow:\s*\/\s*$/m)
  })

  it('has an llms.txt that describes the product', () => {
    expect(read('public/llms.txt')).toMatch(/^# FlowBoard/)
  })

  it('has a 1200x630 PNG social preview image', () => {
    const png = readFileSync(join(ROOT, 'public/og-image.png'))
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(png.readUInt32BE(16)).toBe(1200)
    expect(png.readUInt32BE(20)).toBe(630)
  })
})

// The build plugins live in vite.config.ts; call them directly instead of running a full build.
type Tag = { tag: string; attrs?: Record<string, string>; children?: string }
type Emitted = { fileName: string; source: string }
type SeoPlugin = {
  name: string
  apply?: string
  transformIndexHtml: () => Tag[]
  generateBundle?: (this: { emitFile: (f: Emitted) => void }) => void
}

async function plugins(env: Record<string, string>) {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
  const config = await (viteConfig as unknown as (e: object) => Promise<{
    plugins: { name?: string }[]
    build: { rollupOptions: { output: { manualChunks: (id: string) => string | undefined } } }
  }>)({ mode: 'production', command: 'build' })
  const find = (name: string) => config.plugins.flat().find(p => p && p.name === name) as unknown as SeoPlugin
  return { config, seo: find('seo'), csp: find('csp') }
}

const attr = (tags: Tag[], key: string, value: string) => tags.find(t => t.attrs?.[key] === value)

describe('build: SEO plugin', () => {
  it('adds canonical, og:url, og:image and structured data only when the site URL is known', async () => {
    const { seo } = await plugins({ VITE_SITE_URL: 'https://example.com/' })
    const tags = seo.transformIndexHtml()

    // the trailing slash on the setting must not produce "//"
    expect(attr(tags, 'rel', 'canonical')?.attrs?.href).toBe('https://example.com/')
    expect(attr(tags, 'property', 'og:url')?.attrs?.content).toBe('https://example.com/')
    expect(attr(tags, 'property', 'og:image')?.attrs?.content).toBe('https://example.com/og-image.png')
    expect(attr(tags, 'property', 'og:image:width')?.attrs?.content).toBe('1200')
    expect(attr(tags, 'name', 'twitter:card')?.attrs?.content).toBe('summary_large_image')

    const jsonLd = JSON.parse(tags.find(t => t.attrs?.type === 'application/ld+json')!.children!)
    expect(jsonLd).toMatchObject({ '@type': 'WebApplication', name: 'FlowBoard', url: 'https://example.com/' })
  })

  it('leaves those out, instead of guessing a domain, when no site URL is set', async () => {
    const { seo } = await plugins({ VITE_SITE_URL: '' })
    const tags = seo.transformIndexHtml()
    expect(attr(tags, 'rel', 'canonical')).toBeUndefined()
    expect(attr(tags, 'property', 'og:image')).toBeUndefined()
    expect(tags.some(t => t.attrs?.type === 'application/ld+json')).toBe(false)
    expect(attr(tags, 'name', 'twitter:card')?.attrs?.content).toBe('summary')
  })

  it('preconnects to Supabase for faster first load', async () => {
    const { seo } = await plugins({ VITE_SUPABASE_URL: 'https://abc.supabase.co' })
    expect(attr(seo.transformIndexHtml(), 'rel', 'preconnect')?.attrs?.href).toBe('https://abc.supabase.co')
  })

  it('writes a sitemap and a robots.txt that points to it', async () => {
    const { seo } = await plugins({ VITE_SITE_URL: 'https://example.com' })
    const emitted: Emitted[] = []
    seo.generateBundle!.call({ emitFile: f => emitted.push(f) })

    const sitemap = emitted.find(f => f.fileName === 'sitemap.xml')!.source
    expect(sitemap).toContain('<loc>https://example.com/</loc>')
    expect(emitted.find(f => f.fileName === 'robots.txt')!.source).toContain('Sitemap: https://example.com/sitemap.xml')
  })

  it('writes no sitemap without a site URL', async () => {
    const { seo } = await plugins({ VITE_SITE_URL: '' })
    const emitted: Emitted[] = []
    seo.generateBundle!.call({ emitFile: f => emitted.push(f) })
    expect(emitted).toEqual([])
  })
})

describe('build: Content-Security-Policy plugin', () => {
  it('only applies to production builds', async () => {
    expect((await plugins({})).csp.apply).toBe('build')
  })

  it('allows only this site and Supabase, with no inline scripts or plugins', async () => {
    const { csp } = await plugins({ VITE_SUPABASE_URL: 'https://abc.supabase.co' })
    const policy = csp.transformIndexHtml()[0].attrs!.content
    expect(policy).toContain("script-src 'self'")
    expect(policy).not.toContain('unsafe-inline')
    expect(policy).not.toContain('unsafe-eval')
    expect(policy).toContain("object-src 'none'")
    expect(policy).toContain("connect-src 'self' https://abc.supabase.co wss://abc.supabase.co")
  })
})

describe('build: bundle splitting', () => {
  it('puts Supabase and React in their own long-cached chunks', async () => {
    const { config } = await plugins({})
    const manualChunks = config.build.rollupOptions.output.manualChunks
    expect(manualChunks('/x/node_modules/@supabase/auth-js/index.js')).toBe('supabase')
    expect(manualChunks('/x/node_modules/react-dom/index.js')).toBe('react')
    expect(manualChunks('/x/src/App.tsx')).toBeUndefined()
  })
})
