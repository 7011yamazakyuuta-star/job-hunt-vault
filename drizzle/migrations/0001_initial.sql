PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_sub TEXT UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  google_picture_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT,
  revoked_at TEXT
);
CREATE INDEX IF NOT EXISTS user_sessions_user_idx ON user_sessions(user_id);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  room_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('personal', 'shared')),
  join_enabled INTEGER NOT NULL CHECK (join_enabled IN (0, 1)),
  passphrase_hash TEXT,
  passphrase_salt TEXT,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS rooms_owner_idx ON rooms(owner_user_id);

CREATE TABLE IF NOT EXISTS room_members (
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name_in_room TEXT NOT NULL,
  avatar_kind TEXT NOT NULL CHECK (avatar_kind IN ('emoji', 'initials', 'photo')),
  avatar_emoji TEXT,
  avatar_color TEXT,
  avatar_r2_key TEXT,
  avatar_thumb_r2_key TEXT,
  role TEXT NOT NULL CHECK (role IN ('owner', 'member')),
  joined_at TEXT NOT NULL,
  PRIMARY KEY (room_id, user_id)
);
CREATE INDEX IF NOT EXISTS room_members_user_idx ON room_members(user_id);

CREATE TABLE IF NOT EXISTS room_invites (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  invite_code_hash TEXT NOT NULL UNIQUE,
  passphrase_hash TEXT,
  passphrase_salt TEXT,
  expires_at TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  used_at TEXT
);
CREATE INDEX IF NOT EXISTS room_invites_room_idx ON room_invites(room_id);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  reset_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  priority_deadline_at TEXT,
  career_url TEXT,
  mypage_url TEXT,
  logo_url TEXT,
  logo_r2_key TEXT,
  memo TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS companies_room_idx ON companies(room_id);
CREATE INDEX IF NOT EXISTS companies_room_name_idx ON companies(room_id, name);

CREATE TABLE IF NOT EXISTS company_catalog (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_id TEXT,
  country TEXT NOT NULL DEFAULT 'JP',
  name TEXT NOT NULL,
  name_kana TEXT,
  normalized_name TEXT NOT NULL,
  domain TEXT,
  industry TEXT,
  market TEXT,
  ticker TEXT,
  exchange TEXT,
  logo_url TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS company_catalog_normalized_name_idx ON company_catalog(normalized_name);
CREATE INDEX IF NOT EXISTS company_catalog_ticker_idx ON company_catalog(ticker);
CREATE INDEX IF NOT EXISTS company_catalog_domain_idx ON company_catalog(domain);
CREATE INDEX IF NOT EXISTS company_catalog_industry_idx ON company_catalog(industry);

CREATE TABLE IF NOT EXISTS test_types (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS company_test_reports (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  test_type_id TEXT REFERENCES test_types(id) ON DELETE SET NULL,
  source TEXT,
  notes TEXT,
  visibility TEXT NOT NULL CHECK (visibility IN ('room', 'private')),
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS company_test_reports_room_company_idx ON company_test_reports(room_id, company_id);

CREATE TABLE IF NOT EXISTS selection_steps (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  step_order INTEGER NOT NULL,
  due_at TEXT,
  interview_at TEXT,
  memo TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS selection_steps_room_company_order_idx ON selection_steps(room_id, company_id, step_order);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  overall_status TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('room', 'private')),
  mypage_url TEXT,
  personal_note_encrypted TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS applications_room_user_idx ON applications(room_id, user_id);
CREATE INDEX IF NOT EXISTS applications_company_idx ON applications(company_id);

CREATE TABLE IF NOT EXISTS application_step_progress (
  id TEXT PRIMARY KEY,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  selection_step_id TEXT NOT NULL REFERENCES selection_steps(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('room', 'private')),
  memo_encrypted TEXT,
  due_at TEXT,
  completed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (application_id, selection_step_id)
);
CREATE INDEX IF NOT EXISTS application_step_progress_user_idx ON application_step_progress(user_id);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  visibility TEXT NOT NULL CHECK (visibility IN ('room', 'private')),
  kind TEXT NOT NULL,
  notes_encrypted TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS events_room_starts_idx ON events(room_id, starts_at);
CREATE INDEX IF NOT EXISTS events_user_idx ON events(user_id);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
  application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_at TEXT,
  status TEXT NOT NULL,
  visibility TEXT NOT NULL CHECK (visibility IN ('room', 'private')),
  notes_encrypted TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS tasks_room_due_idx ON tasks(room_id, due_at);
CREATE INDEX IF NOT EXISTS tasks_user_idx ON tasks(user_id);

CREATE TABLE IF NOT EXISTS vaults (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  kdf_params_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS credential_items (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id TEXT REFERENCES rooms(id) ON DELETE CASCADE,
  application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
  encrypted_payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS credential_items_owner_idx ON credential_items(owner_user_id);
CREATE INDEX IF NOT EXISTS credential_items_room_owner_idx ON credential_items(room_id, owner_user_id);

CREATE TABLE IF NOT EXISTS logo_cache (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  source TEXT NOT NULL,
  logo_url TEXT,
  r2_key TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_logs_room_created_idx ON audit_logs(room_id, created_at);
CREATE INDEX IF NOT EXISTS audit_logs_actor_idx ON audit_logs(actor_user_id);

INSERT INTO test_types (id, label, created_at) VALUES
  ('test_spi', 'SPI', '2026-06-21T00:00:00.000Z'),
  ('test_tamatebako', '玉手箱', '2026-06-21T00:00:00.000Z'),
  ('test_tg_web', 'TG-WEB', '2026-06-21T00:00:00.000Z'),
  ('test_cab', 'CAB', '2026-06-21T00:00:00.000Z'),
  ('test_gab', 'GAB', '2026-06-21T00:00:00.000Z'),
  ('test_web_cab', 'Web-CAB', '2026-06-21T00:00:00.000Z'),
  ('test_cubic', 'CUBIC', '2026-06-21T00:00:00.000Z'),
  ('test_tal', 'TAL', '2026-06-21T00:00:00.000Z'),
  ('test_scoa', 'SCOA', '2026-06-21T00:00:00.000Z'),
  ('test_ef_1g', 'eF-1G', '2026-06-21T00:00:00.000Z'),
  ('test_gps', 'GPS', '2026-06-21T00:00:00.000Z'),
  ('test_company_original', '企業独自', '2026-06-21T00:00:00.000Z'),
  ('test_unknown', '不明', '2026-06-21T00:00:00.000Z')
ON CONFLICT(id) DO NOTHING;
