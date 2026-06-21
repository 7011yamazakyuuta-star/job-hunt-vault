# AGENTS.md

## Project Summary

Job Hunt Vault is a Cloudflare Workers web app for managing job-hunting data in personal rooms and invite-only shared rooms. Google login identifies the user. Rooms control collaboration. Personal Vault data is encrypted in the browser and stored only as encrypted payloads.

## Stack

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

## Public Repo Safety Rules

- Never commit real IDs, passwords, secrets, private notes, job-hunting data, `.env`, `.dev.vars`, DB dumps, exports, or real photos/images.
- Keep all production secrets in Cloudflare Workers Secrets.
- Keep R2 buckets private.
- Do not log request bodies, passphrases, session tokens, credential plaintext, or image bytes.
- Use placeholder-only data in tests, docs, screenshots, and migrations.

## Google OAuth Rules

- Production auth uses Google OAuth.
- OAuth secrets are read from Workers Secrets.
- Session tokens must be random and stored only as hashes in D1.
- Cookies must be HttpOnly, Secure, SameSite, and scoped to `/`.
- Local mock auth is allowed only when explicitly enabled with `LOCAL_AUTH_ENABLED=true`.

## Room Authorization Rules

- Every Room API must verify current user membership.
- Owner-only actions must check `room_members.role = 'owner'`.
- Room passphrases must be salted and hashed.
- Personal rooms must not be joinable.
- Shared room data can include room-visible companies, selection steps, deadlines, test reports, and room-visible progress.
- Private progress must remain visible only to its owner.

## Avatar Rules

- Supported avatar kinds: `emoji`, `initials`, and `photo`.
- Photo uploads must validate content type and size server-side.
- Allowed image types: JPEG, PNG, and WebP.
- R2 object keys must be hard to guess.
- Avatar photos must be served through authorized Worker routes, never raw R2 URLs.
- Delete old R2 objects when replacing or removing photos.

## Vault Rules

- The Vault master passphrase must never be sent to the server.
- Encryption and decryption happen in the browser.
- D1 stores encrypted JSON payloads only.
- Credential sharing is out of scope for the MVP.
- Vault API queries must always filter by `owner_user_id = currentUser.id`.

## Test Format Requirements

The seed list is:

- SPI
- 玉手箱
- TG-WEB
- CAB
- GAB
- Web-CAB
- CUBIC
- TAL
- SCOA
- eF-1G
- GPS
- 企業独自
- 不明

## UI Requirements

- Build the actual app shell first, not a marketing landing page.
- Use dense, work-focused layouts suitable for repeated tracking.
- Use icons for common actions and navigation.
- Keep UI elements stable across desktop and mobile.
- Avoid using visible app text as a substitute for real controls.

## Testing Requirements

Run these before finishing work:

```bash
npm run typecheck
npm test
npm run build
```

Add focused unit tests for security helpers, validation, authorization, and API behavior as implementation expands. Keep Playwright smoke tests for the app shell and critical room/Vault flows.

## Code Style Requirements

- Prefer existing project patterns.
- Validate API inputs with Zod.
- Use Web Crypto for tokens, passphrases, and Vault crypto.
- Do not use `Math.random()` for IDs, tokens, passphrases, or object keys.
- Do not introduce module-level mutable request state.
- Keep Workers bindings aligned with `wrangler.jsonc`; regenerate types with `npm run cf-typegen` after binding changes.
- Keep comments short and useful.
