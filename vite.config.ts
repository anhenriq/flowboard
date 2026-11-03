import react from '@vitejs/plugin-react'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

const DESCRIPTION =
  'FlowBoard is a simple Kanban board. Sign in to organize tasks across Backlog, In Progress, In Review and Done, with priorities, due dates and assignees.'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const supabaseUrl = env.VITE_SUPABASE_URL
  // public address of the deployed site, e.g. https://flowboard.example.com (no trailing slash)
  const siteUrl = env.VITE_SITE_URL?.replace(/\/+$/, '')

  return {
    plugins: [
      react(),
      {
        // SEO tags that need an absolute URL, plus the sitemap and robots.txt, only exist when
        // VITE_SITE_URL is set; guessing a domain would publish wrong canonical links
        name: 'seo',
        transformIndexHtml: () => {
          const tags: { tag: string; attrs?: Record<string, string>; children?: string; injectTo: 'head' }[] = []
          if (supabaseUrl) {
            tags.push({ tag: 'link', attrs: { rel: 'preconnect', href: supabaseUrl, crossorigin: '' }, injectTo: 'head' })
          }
          // social crawlers need absolute image URLs, so the preview card is only large when the domain is known
          tags.push({ tag: 'meta', attrs: { name: 'twitter:card', content: siteUrl ? 'summary_large_image' : 'summary' }, injectTo: 'head' })
          if (siteUrl) {
            tags.push(
              { tag: 'meta', attrs: { property: 'og:image', content: `${siteUrl}/og-image.png` }, injectTo: 'head' },
              { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' }, injectTo: 'head' },
              { tag: 'meta', attrs: { property: 'og:image:height', content: '630' }, injectTo: 'head' },
              { tag: 'meta', attrs: { property: 'og:image:alt', content: 'FlowBoard Kanban board with cards in Backlog, In Progress, In Review and Done columns' }, injectTo: 'head' },
              { tag: 'meta', attrs: { name: 'twitter:image', content: `${siteUrl}/og-image.png` }, injectTo: 'head' },

              { tag: 'link', attrs: { rel: 'canonical', href: `${siteUrl}/` }, injectTo: 'head' },
              { tag: 'meta', attrs: { property: 'og:url', content: `${siteUrl}/` }, injectTo: 'head' },
              {
                tag: 'script',
                attrs: { type: 'application/ld+json' },
                children: JSON.stringify({
                  '@context': 'https://schema.org',
                  '@type': 'WebApplication',
                  name: 'FlowBoard',
                  url: `${siteUrl}/`,
                  description: DESCRIPTION,
                  applicationCategory: 'BusinessApplication',
                  operatingSystem: 'Any',
                  browserRequirements: 'Requires JavaScript',
                }),
                injectTo: 'head',
              },
            )
          }
          return tags
        },
        generateBundle() {
          if (!siteUrl) return
          this.emitFile({
            type: 'asset',
            fileName: 'sitemap.xml',
            source:
              '<?xml version="1.0" encoding="UTF-8"?>\n' +
              '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
              `  <url><loc>${siteUrl}/</loc></url>\n` +
              '</urlset>\n',
          })
          // replaces public/robots.txt with a copy that points at the sitemap
          this.emitFile({
            type: 'asset',
            fileName: 'robots.txt',
            source: `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`,
          })
        },
      },
      {
        // CSP is added to production builds only: the dev server needs inline scripts for hot reload
        name: 'csp',
        apply: 'build',
        transformIndexHtml: () => {
          const connect = supabaseUrl ? `'self' ${supabaseUrl} ${supabaseUrl.replace('https:', 'wss:')}` : "'self'"
          const policy = [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self'",
            "img-src 'self' data:",
            `connect-src ${connect}`,
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
          ].join('; ')
          return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: policy }, injectTo: 'head-prepend' }]
        },
      },
    ],
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts',
      restoreMocks: true,
      // a UTC-behind zone, so "late evening locally" is already tomorrow in UTC (the overdue-date bug)
      env: { TZ: 'America/Phoenix' },
    },
    build: {
      rollupOptions: {
        output: {
          // separate long-lived libraries from app code so a deploy doesn't re-download them
          manualChunks: id => {
            if (id.includes('@supabase')) return 'supabase'
            if (id.includes('node_modules/react')) return 'react'
          },
        },
      },
    },
  }
})
