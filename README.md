# FlowBoard

A single-board Kanban app: sign in, then create cards and drag them across
Backlog, In Progress, In Review and Done. Built with React, TypeScript, Vite and Supabase.

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in your Supabase project values:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
3. `npm run dev`

If the variables are missing the app shows a setup message instead of the board.

### SEO (optional)

Set `VITE_SITE_URL` (for example `https://flowboard.example.com`, no trailing slash) before a production
build to add the canonical URL, `og:url`, structured data and a `sitemap.xml`, and to point `robots.txt`
at it. Without it those are left out rather than guessed. It also turns on the large social preview
image (`public/og-image.png`, 1200×630, a board with sample cards, not real data).

## Deploying

Pushing to `main` deploys to Vercel automatically. The Vercel build runs `npm test` before
`npm run build` (see `vercel.json`), so a failing test stops the deploy. GitHub Actions
(`.github/workflows/ci.yml`) runs lint, tests and the build on every push and pull request.
Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in the Vercel project settings.

## Scripts

| Command           | What it does                   |
| ----------------- | ------------------------------ |
| `npm run dev`     | Start the Vite dev server      |
| `npm run build`   | Type-check and build to `dist` |
| `npm run lint`    | Run Oxlint                     |
| `npm run preview` | Serve the production build     |

## Database

The schema lives in `supabase/migrations/`. The first file is a baseline reconstructed from the
live database, so check it against your project; the second is the hardening that was applied.

Every user can read and write only their own cards (row level security, `auth.uid() = user_id`).
Signed-out visitors have no access. The app only ever uses the publishable key; never put the
`service_role` key in `.env.local` or any `VITE_` variable, since those are shipped to the browser.

In the Supabase dashboard, also turn on leaked-password protection and set the minimum
password length to 8 or more (Authentication settings).
