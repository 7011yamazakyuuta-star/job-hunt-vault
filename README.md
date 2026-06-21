# Job Hunt Vault

Job Hunt Vault is a personal and shared-room job-hunting tracker built for Cloudflare Workers. It manages companies, career URLs, my-page URLs, selection steps, applications, deadlines, interviews, test formats, room-visible progress, and a personal encrypted vault.

This repository is public. Do not commit real job-hunting data, account IDs, passwords, private notes, `.env`, `.dev.vars`, database dumps, exports, or real photos/images.

## Features

- Google OAuth skeleton with hashed session-token storage.
- Explicit local-development mock user mode.
- Personal room creation for one-person tracking.
- Shared room creation and join flow using Room ID/code plus passphrase.
- Joined room listing for the app sidebar.
- D1 schema and migration for users, sessions, rooms, members, companies, progress, events, tasks, vaults, logos, and audit logs.
- Company catalog schema for JPX/manual/provider-backed reference data.
- R2 avatar binding skeleton with authenticated Worker delivery.
- Zod-validated Hono API routes.
- React + Vite app shell with required frontend routes.
- Browser-side Vault crypto module using PBKDF2 + AES-GCM.
- Optional Logo.dev resolver/search integration for company logos.
- Step-by-step Cloudflare setup guide in `docs/CLOUDFLARE_SETUP.md`.
- Company catalog plan in `docs/DATA_CATALOG.md`.
- GitHub Actions CI and Dependabot.

## Tech Stack

- TypeScript
- React + Vite
- Cloudflare Workers Static Assets
- Hono
- Cloudflare D1
- Cloudflare R2
- Drizzle ORM
- Zod
- Vitest
- Playwright
- Google OAuth
- Optional Cloudflare Turnstile

## Security Model

- Google login identifies a person; Room membership controls shared data access.
- Session tokens are stored only as hashes in D1.
- Room passphrases are salted and hashed before storage.
- Every Room API verifies membership server-side.
- Private application progress is visible only to the owner user.
- Vault credential payloads are encrypted in the browser; the API accepts encrypted JSON only.
- The Vault master passphrase must never be sent to the Worker.
- Avatar images are stored in private R2 and served through authorized Worker routes.
- Raw R2 URLs are not exposed.
- Request bodies, passphrases, session tokens, credential plaintext, and image bytes must not be logged.

## Local Development

Install dependencies:

```bash
npm install
```

Generate Cloudflare binding types after changing `wrangler.jsonc`:

```bash
npm run cf-typegen
```

Run the React dev server:

```bash
npm run dev
```

Run the Worker locally:

```bash
npm run dev:worker
```

For local-only mock auth, use explicit environment variables:

```bash
LOCAL_AUTH_ENABLED=true
LOCAL_AUTH_EMAIL=dev@example.com
LOCAL_AUTH_NAME="Dev User"
```

Keep real local values in `.dev.vars` or your shell environment. Do not commit `.dev.vars`.

## Google OAuth Setup

Create a Google OAuth client and set the callback URL to:

```text
https://<your-worker-host>/api/auth/google/callback
```

Set production values with Workers Secrets:

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put SESSION_SECRET
```

The OAuth callback exchanges the authorization code, verifies Google's ID token signature and claims, upserts the user, creates a hashed session token, and redirects to the app.

## Cloudflare Setup

For step-by-step setup, including what to tell Codex in this chat and what never to paste, see:

```text
docs/CLOUDFLARE_SETUP.md
```

Create a Worker, D1 database, and R2 bucket, then update `wrangler.jsonc`:

```bash
wrangler d1 create job-hunt-vault
wrangler r2 bucket create job-hunt-vault-avatars
```

Replace the placeholder D1 `database_id` in `wrangler.jsonc`.

## D1 Setup

Apply migrations locally:

```bash
wrangler d1 migrations apply job-hunt-vault --local
```

Apply migrations remotely:

```bash
wrangler d1 migrations apply job-hunt-vault --remote
```

The first migration seeds these test formats: SPI, 玉手箱, TG-WEB, CAB, GAB, Web-CAB, CUBIC, TAL, SCOA, eF-1G, GPS, 企業独自, and 不明.

## R2 Setup

The Worker expects an R2 binding named `AVATAR_BUCKET`. The bucket must remain private. Avatar images should be fetched through:

```text
GET /api/rooms/:roomId/members/:userId/avatar
```

## Workers Secrets Setup

Expected secrets:

```bash
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put SESSION_SECRET
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put LOGO_DEV_SECRET_KEY
wrangler secret put LOGO_DEV_PUBLISHABLE_KEY
```

`LOGO_DEV_SECRET_KEY` is optional for server-side brand search. `LOGO_DEV_PUBLISHABLE_KEY` is optional for domain-based image URLs. Keep both out of git and chat.

## Company Catalog

`company_catalog` stores reference data such as JPX-listed company names, readings, ticker codes, market segments, industries, candidate domains, and provider metadata. It is separate from room-level `companies`, so importing or refreshing official data does not modify user progress, deadlines, notes, or Vault data. Room-level companies can keep copied identifiers such as `name_kana`, `ticker`, and `exchange` alongside user-managed deadlines and notes.

Use `GET /api/company-catalog/search` for local catalog lookup and `GET /api/logo/search` for provider-backed logo candidates. Catalog search supports industry filtering and `sort=industry` or `sort=ticker`. See `docs/DATA_CATALOG.md`.

To convert a JPX/manual CSV into D1-ready SQL:

```bash
npm run catalog:sql -- --input ./work/jpx.csv --out ./work/company_catalog.sql
```

## Turnstile Setup

Turnstile is optional in this MVP. If enabled later, validate tokens server-side before sensitive flows such as room join and invitation creation. Store the secret using:

```bash
wrangler secret put TURNSTILE_SECRET_KEY
```

## Migration Commands

```bash
npm run db:generate
wrangler d1 migrations apply job-hunt-vault --local
wrangler d1 migrations apply job-hunt-vault --remote
```

## Deploy Commands

```bash
npm run build
wrangler deploy
```

## CI

GitHub Actions runs:

```bash
npm run typecheck
npm test
npm run build
```

Dependabot checks npm and GitHub Actions dependencies weekly.

## Repository Safety Checklist

- Do not commit real personal data, company application data, exports, DB dumps, or real photos.
- Do not commit `.env`, `.env.*`, `.dev.vars`, `.dev.vars.*`, local SQLite/D1 files, or R2 mirrors.
- Keep production secrets in Workers Secrets.
- Review logs before deployment to ensure no request body, passphrase, token, credential plaintext, or image byte logging exists.
- Use placeholder data in tests and docs.

## Company Logo Trademark Notice

Company logos and trademarks belong to their respective owners. Manual logo URLs or provider-based resolution must be used only for identification inside the user's job-hunting workspace and should not imply endorsement or affiliation.
