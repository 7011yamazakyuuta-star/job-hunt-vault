import type { MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { nowIso, randomId, randomTokenHex, sha256Hex } from "./crypto";
import { jsonError } from "./http";
import type { AppBindings, AppContext, User } from "./types";

const SESSION_COOKIE = "jhv_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

type UserRow = {
  id: string;
  email: string;
  name: string;
  google_picture_url: string | null;
};

export const requireUser: MiddlewareHandler<AppBindings> = async (c, next) => {
  const user = await getCurrentUser(c);
  if (!user) {
    return jsonError(c, 401, "Authentication required");
  }
  c.set("user", user);
  return next();
};

export async function getCurrentUser(c: AppContext): Promise<User | null> {
  const localAuth = getLocalAuthConfig(c.env);
  if (localAuth.enabled === "true") {
    return ensureLocalUser(c.env, localAuth.email, localAuth.name);
  }

  const token = getCookie(c, SESSION_COOKIE);
  if (!token) {
    return null;
  }

  const tokenHash = await sha256Hex(token);
  const row = await c.env.DB.prepare(
    `SELECT users.id, users.email, users.name, users.google_picture_url
     FROM user_sessions
     INNER JOIN users ON users.id = user_sessions.user_id
     WHERE user_sessions.token_hash = ?
       AND user_sessions.revoked_at IS NULL
       AND user_sessions.expires_at > ?
     LIMIT 1`,
  )
    .bind(tokenHash, nowIso())
    .first<UserRow>();

  if (!row) {
    return null;
  }

  await c.env.DB.prepare("UPDATE user_sessions SET last_seen_at = ? WHERE token_hash = ?")
    .bind(nowIso(), tokenHash)
    .run();

  return mapUser(row);
}

export async function ensureLocalUser(env: Env, email: string, name: string): Promise<User> {
  const now = nowIso();
  const existing = await env.DB.prepare(
    "SELECT id, email, name, google_picture_url FROM users WHERE email = ? LIMIT 1",
  )
    .bind(email)
    .first<UserRow>();

  if (existing) {
    return mapUser(existing);
  }

  const id = randomId("user");
  await env.DB.prepare(
    `INSERT INTO users (id, google_sub, email, name, google_picture_url, created_at, updated_at)
     VALUES (?, NULL, ?, ?, NULL, ?, ?)`,
  )
    .bind(id, email, name, now, now)
    .run();

  return { id, email, name, googlePictureUrl: null };
}

export async function createSession(env: Env, userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomTokenHex(32);
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  await env.DB.prepare(
    `INSERT INTO user_sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at, revoked_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL)`,
  )
    .bind(randomId("session"), userId, tokenHash, expiresAt.toISOString(), now.toISOString(), now.toISOString())
    .run();

  return { token, expiresAt };
}

export function setSessionCookie(c: AppContext, token: string, expiresAt: Date): void {
  setCookie(c, SESSION_COOKIE, token, {
    expires: expiresAt,
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
  });
}

export async function revokeSession(c: AppContext): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) {
    const tokenHash = await sha256Hex(token);
    await c.env.DB.prepare("UPDATE user_sessions SET revoked_at = ? WHERE token_hash = ?")
      .bind(nowIso(), tokenHash)
      .run();
  }
  deleteCookie(c, SESSION_COOKIE, {
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
  });
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    googlePictureUrl: row.google_picture_url,
  };
}

function getLocalAuthConfig(env: Env): { enabled: string; email: string; name: string } {
  const runtimeEnv = env as Env & {
    LOCAL_AUTH_ENABLED: string;
    LOCAL_AUTH_EMAIL: string;
    LOCAL_AUTH_NAME: string;
  };
  return {
    enabled: runtimeEnv.LOCAL_AUTH_ENABLED,
    email: runtimeEnv.LOCAL_AUTH_EMAIL,
    name: runtimeEnv.LOCAL_AUTH_NAME,
  };
}
