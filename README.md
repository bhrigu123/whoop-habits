<p align="center">
  <img src="public/logo.png" alt="Whoop Habits" width="80" style="border-radius: 16px" />
</p>

<h1 align="center">Whoop Habits</h1>

<p align="center">Habit tracking that fills itself in from your WHOOP data.</p>

---

Set habits like **😴 sleep 8h+** or **🏃 run 3×/week** and watch them check themselves off from your WHOOP sleep and workout data. A weekly ✓/✗ board, plus minimal monthly and yearly red/green grids per habit - the views WHOOP doesn't give you.

## Features

- **Sign in with WHOOP** - no separate account; the OAuth consent *is* the signup.
- **Auto-graded habits** - sleep duration and workout frequency habits evaluate from synced WHOOP records; manual habits for everything else.
- **Weekly board** - Mon–Sun grid with per-day results and weekly progress badges (`2/3`).
- **Month & year views** - calendar and GitHub-contribution-style grids with per-period stats (success rate, average sleep, weeks at target).
- **Three-phase sync** - 14 days at connect time (seconds), 13-month backfill in the background, incremental refresh on every visit. Habits re-grade retroactively when you edit them, because results are always computed from raw records.
- **Light/dark theme**, warm palettes, default starter habits for new users.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router, RSC) + TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui (Base UI) |
| Database | Neon Postgres (via Vercel Marketplace) + Drizzle ORM |
| WHOOP auth | [Vercel Connect](https://vercel.com/docs/connect) Custom OAuth connector - holds the WHOOP grant, mints short-lived tokens at runtime; no tokens stored in our DB |
| Sessions | Hand-rolled: httpOnly cookie, SHA-256 token hash in Postgres |
| Hosting | Vercel |

## Architecture

```
src/
  app/                  # routes: landing, dashboard, habits/[id], privacy,
                        #   auth/whoop/callback, api/sync
  components/habits/    # week board, month/year grids, habit dialog
  lib/
    auth/               # sessions + WHOOP-as-login flow
    connect/            # Vercel Connect wrapper (token minting)
    whoop/              # typed WHOOP v2 API client, backoff, date attribution
    sync/               # three-phase sync engine
    habits/             # pure evaluation engine + CRUD actions
```

Key design decision: WHOOP records are stored raw + normalized, and habit results are **evaluated at read time** by pure functions (`lib/habits/engine.ts`) - never precomputed. Editing a habit's config instantly re-grades all history.

## Local development

```bash
pnpm install
vercel link                # link to the Vercel project
vercel env pull            # DATABASE_URL, VERCEL_OIDC_TOKEN → .env.local
pnpm db:migrate            # apply Drizzle migrations
pnpm dev
```

Requirements beyond env vars:

1. A [WHOOP developer app](https://developer-dashboard.whoop.com) with scopes `read:profile`, `read:sleep`, `read:workout` and the Vercel Connect callback URL registered as its redirect URI.
2. A Vercel Connect **Custom OAuth** connector for WHOOP (this project expects uid `whoop.com/whoop-habits`) linked to the Vercel project.

The `VERCEL_OIDC_TOKEN` from `vercel env pull` expires - re-pull if Connect calls start failing locally.

## Scripts

- `pnpm dev` / `pnpm build` / `pnpm lint`
- `pnpm db:generate` - create a migration from schema changes
- `pnpm db:migrate` - apply migrations
- `pnpm db:studio` - browse the database

## Privacy

Read-only WHOOP access, no selling, no ads, no third parties beyond Vercel/Neon. Full policy at [`/privacy`](src/app/privacy/page.tsx).
