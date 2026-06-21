# Job Hunt Vault Project Spec

## Product Goal

Job Hunt Vault is a Cloudflare Workers web application for managing job-hunting information in either a personal room or a shared friend room.

- Google login identifies the person.
- A Room is the collaboration boundary for company information and shared progress.
- A Personal room is a one-person workspace with joining disabled.
- A Shared room is an invite-only workspace joined with Room ID/code and passphrase.
- Personal Vault stores encrypted credential payloads visible only to the owner user.

Firebase is not used. The implementation target is Cloudflare Workers + D1 + R2.

## MVP Scope

This first PR is a safe skeleton, not the completed product. It must include:

- React app shell.
- Frontend API client for room creation, room join, company listing, company creation, catalog lookup, logo candidate search, application progress, calendar events, tasks, test reports, and Vault items.
- Hono API shell.
- `/api/health`.
- Google OAuth start/callback implementation.
- Local mock user mode.
- Routing for required frontend paths.
- Drizzle schema.
- D1 migration and `test_types` seed.
- R2 avatar binding.
- Zod request schemas.
- Room/session/security helpers.
- Personal room creation.
- Shared room creation.
- Room join.
- Avatar selector/upload UI.
- Company CRUD.
- Company catalog CSV-to-SQL import helper.
- Selection step skeleton.
- Test report skeleton.
- Progress skeleton.
- Vault crypto module skeleton.
- Vault encrypted item UI.
- README.
- AGENTS.md.
- Cloudflare setup guide.
- GitHub Actions CI.
- Dependabot.
- Unit test skeleton.
- Playwright smoke test skeleton.

## Frontend Routes

- `/`
- `/personal/new`
- `/rooms/new`
- `/join/:roomCode?`
- `/rooms/:roomId`
- `/rooms/:roomId/companies`
- `/rooms/:roomId/companies/:companyId`
- `/rooms/:roomId/progress`
- `/rooms/:roomId/kanban`
- `/rooms/:roomId/tests`
- `/rooms/:roomId/calendar`
- `/rooms/:roomId/vault`
- `/rooms/:roomId/settings`

## API Surface

### Health and Auth

- `GET /api/health`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `GET /api/me`
- `POST /api/logout`

Google OAuth callback flow:

1. Exchange authorization code for tokens.
2. Verify Google `id_token` signature and claims.
3. Upsert `users`.
4. Create a random session token.
5. Store only `HMAC-SHA-256(session_token, SESSION_SECRET)` in `user_sessions`.
6. Set HttpOnly, Secure, SameSite session cookie.
7. Redirect to the app.

Local auth is allowed only with:

- `LOCAL_AUTH_ENABLED=true`
- `LOCAL_AUTH_EMAIL=dev@example.com`
- `LOCAL_AUTH_NAME=Dev User`

### Rooms

- `POST /api/rooms/personal`
- `GET /api/rooms`
- `POST /api/rooms`
- `POST /api/rooms/join`
- `GET /api/rooms/:roomId`
- `PATCH /api/rooms/:roomId`
- `POST /api/rooms/:roomId/convert-to-shared`
- `POST /api/rooms/:roomId/rotate-passphrase`
- `GET /api/rooms/:roomId/members`

Room rules:

- Personal rooms set `join_enabled = 0`.
- Shared rooms set `join_enabled = 1`.
- Room passphrases are salted and hashed.
- Room membership must be checked for every room route.
- Owner-only operations require `room_members.role = 'owner'`.

### Avatar APIs

- `PUT /api/rooms/:roomId/members/:userId/avatar`
- `GET /api/rooms/:roomId/members/:userId/avatar`
- `DELETE /api/rooms/:roomId/members/:userId/avatar`

Avatar rules:

- `avatar_kind` supports `emoji`, `initials`, and `photo`.
- Photo uploads accept only `image/jpeg`, `image/png`, and `image/webp`.
- Upload size must be bounded by `MAX_AVATAR_UPLOAD_BYTES`.
- Photos are stored in private R2 binding `AVATAR_BUCKET`.
- D1 stores object keys and metadata only.
- Images are served through authorized Worker routes.

### Company and Selection APIs

- `GET /api/rooms/:roomId/companies`
- `GET /api/rooms/:roomId/companies?sort=deadline|kana|industry&industry=自動車`
- `POST /api/rooms/:roomId/companies`
- `GET /api/rooms/:roomId/companies/:companyId`
- `PATCH /api/rooms/:roomId/companies/:companyId`
- `DELETE /api/rooms/:roomId/companies/:companyId`
- `GET /api/rooms/:roomId/companies/:companyId/selection-steps`
- `POST /api/rooms/:roomId/selection-steps`
- `GET /api/rooms/:roomId/companies/:companyId/test-reports`
- `POST /api/rooms/:roomId/test-reports`

### Progress, Dashboard, Events, Tasks

- `GET /api/rooms/:roomId/progress`
- `POST /api/rooms/:roomId/applications`
- `PATCH /api/rooms/:roomId/applications/:applicationId`
- `GET /api/rooms/:roomId/dashboard`
- `GET /api/rooms/:roomId/events`
- `POST /api/rooms/:roomId/events`
- `GET /api/rooms/:roomId/tasks`
- `POST /api/rooms/:roomId/tasks`

Progress rules:

- Room-visible progress may be shared with members.
- Private progress must be filtered to the owner user.
- Users cannot edit another user's application progress.

### Vault APIs

- `GET /api/rooms/:roomId/vault/items`
- `POST /api/rooms/:roomId/vault/items`

Vault rules:

- Browser derives the key from the user's passphrase.
- Browser encrypts/decrypts with Web Crypto.
- Server receives encrypted JSON only.
- Server never receives the master passphrase.
- Queries must filter by `owner_user_id = currentUser.id`.
- Credential sharing is out of scope for MVP.

### Logo API

- `GET /api/logo/resolve?domain=example.com`
- `GET /api/logo/search?q=sony&strategy=suggest`

The resolver returns cached logo metadata or a Logo.dev image URL when `LOGO_DEV_PUBLISHABLE_KEY` is configured. Search returns provider-backed brand candidates when `LOGO_DEV_SECRET_KEY` is configured. Provider keys must be stored outside git.

### Company Catalog API

- `GET /api/company-catalog/search?q=sony`
- `GET /api/company-catalog/search?industry=自動車&sort=industry`
- `GET /api/company-catalog/search?q=7203&sort=ticker`

The catalog is reference data only. It supports JPX/manual/provider-backed imports without mutating room-level applications, deadlines, notes, or Vault data.

Catalog import helper:

- `npm run catalog:sql -- --input ./work/jpx.csv --out ./work/company_catalog.sql`

## Database Tables

Required tables:

- `users`
- `user_sessions`
- `rooms`
- `room_members`
- `room_invites`
- `rate_limits`
- `companies`
- `company_catalog`
- `test_types`
- `company_test_reports`
- `selection_steps`
- `applications`
- `application_step_progress`
- `events`
- `tasks`
- `vaults`
- `credential_items`
- `logo_cache`
- `audit_logs`

### Key Fields

`users`:

- `id`
- `google_sub` unique
- `email`
- `name`
- `google_picture_url`
- `created_at`
- `updated_at`

`user_sessions`:

- `id`
- `user_id`
- `token_hash`
- `expires_at`
- `created_at`
- `last_seen_at`
- `revoked_at`

`rooms`:

- `id`
- `room_code`
- `name`
- `type`: `personal` or `shared`
- `join_enabled`
- `passphrase_hash`
- `passphrase_salt`
- `owner_user_id`
- `created_at`
- `updated_at`

`room_members`:

- `room_id`
- `user_id`
- `display_name_in_room`
- `avatar_kind`
- `avatar_emoji`
- `avatar_color`
- `avatar_r2_key`
- `avatar_thumb_r2_key`
- `role`
- `joined_at`

`companies`:

- `id`
- `room_id`
- `name`
- `name_kana`
- `domain`
- `industry`
- `priority_deadline_at`
- `ticker`
- `exchange`
- `career_url`
- `mypage_url`
- `logo_url`
- `memo`
- `created_by_user_id`

`applications`:

- `room_id`
- `company_id`
- `user_id`
- `overall_status`
- `visibility`: `room` or `private`
- `mypage_url`
- `personal_note_encrypted`

`credential_items`:

- `owner_user_id`
- `room_id`
- `application_id`
- `encrypted_payload`

## Test Type Seed

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

## Security Requirements

- Do not store login IDs, passwords, or secret notes in plaintext.
- Encrypt/decrypt Personal Vault data only in the browser.
- Do not send the Vault master passphrase to the server.
- Store only encrypted Vault JSON in D1.
- Do not build credential sharing in the MVP.
- Hash Google OAuth session tokens with `SESSION_SECRET` before storage.
- Hash Room passphrases with salted PBKDF2 before storage.
- Use HttpOnly, Secure, SameSite cookies.
- Validate all API input with Zod.
- Verify room membership on every Room API.
- Prevent editing another user's progress.
- Ensure private progress is owner-only.
- Filter Vault API access by `owner_user_id = currentUser.id`.
- Do not log request bodies, passphrases, session tokens, credential plaintext, or image bytes.
- Store avatar photos in private R2.
- Serve avatar images through authorized Worker routes.
- Do not expose raw R2 URLs.
- Enforce authorization server-side even when UI hides controls.

## Configuration

Cloudflare bindings:

- D1 binding: `DB`
- R2 binding: `AVATAR_BUCKET`
- Static assets binding: `ASSETS`

Expected Workers Secrets:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`
- `TURNSTILE_SECRET_KEY`
- `LOGO_DEV_SECRET_KEY` optional
- `LOGO_DEV_PUBLISHABLE_KEY` optional

## Future Issue Breakdown

1. Add API integration tests with a D1 test database.
2. Add form submission wiring for room creation and join flows.
3. Expand company detail UI and selection-step editing.
4. Implement progress matrix editing and private/room visibility controls.
5. Implement kanban and calendar views.
6. Add Vault item creation UI using browser-side encryption.
7. Add R2 avatar thumbnail generation or client-side resizing.
8. Add invitation URL plus participation code flow.
9. Add optional Turnstile to room join and invite creation.
10. Add JPX/manual import script for `company_catalog`.
11. Add audit log writes for sensitive room and Vault metadata actions.
