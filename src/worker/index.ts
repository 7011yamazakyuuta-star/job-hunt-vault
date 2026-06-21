import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { createSession, getCurrentUser, requireUser, revokeSession, setSessionCookie } from "./auth";
import { nowIso, randomId, randomTokenHex, timingSafeEqualText } from "./crypto";
import { getOptionalNumber, jsonError, parseJson } from "./http";
import { assertCompanyInRoom, hashRoomPassphrase, requireRoomMember, verifyRoomPassphrase } from "./rooms";
import {
  applicationCreateSchema,
  applicationPatchSchema,
  avatarJsonSchema,
  companyCreateSchema,
  companyPatchSchema,
  createPersonalRoomSchema,
  createSharedRoomSchema,
  eventCreateSchema,
  joinRoomSchema,
  patchRoomSchema,
  rotatePassphraseSchema,
  selectionStepSchema,
  taskCreateSchema,
  testReportSchema,
  vaultItemCreateSchema,
} from "./schemas";
import { getSecret } from "./secrets";
import type { AppBindings, AppContext, User } from "./types";

const OAUTH_STATE_COOKIE = "jhv_oauth_state";
const allowedAvatarTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const app = new Hono<AppBindings>();

app.onError((error, c) => {
  console.error(
    JSON.stringify({
      message: "request failed",
      error: error instanceof Error ? error.message : "Unknown error",
      path: new URL(c.req.url).pathname,
    }),
  );
  return jsonError(c, 500, "Internal server error");
});

app.get("/api/health", (c) =>
  c.json({
    ok: true,
    service: "job-hunt-vault",
    time: nowIso(),
  }),
);

app.get("/api/auth/google/start", async (c) => {
  const clientId = getSecret(c.env, "GOOGLE_CLIENT_ID");
  if (!clientId) {
    return jsonError(c, 501, "Google OAuth is not configured");
  }

  const state = randomTokenHex(24);
  setCookie(c, OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: 600,
  });

  const redirectUri = `${new URL(c.req.url).origin}/api/auth/google/callback`;
  const authorizeUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("scope", "openid email profile");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("prompt", "select_account");

  return c.redirect(authorizeUrl.toString(), 302);
});

app.get("/api/auth/google/callback", async (c) => {
  const returnedState = c.req.query("state");
  const storedState = getCookie(c, OAUTH_STATE_COOKIE);
  deleteCookie(c, OAUTH_STATE_COOKIE, {
    path: "/",
    secure: true,
    httpOnly: true,
    sameSite: "Lax",
  });

  if (!returnedState || !storedState || !(await timingSafeEqualText(returnedState, storedState))) {
    return jsonError(c, 400, "Invalid OAuth state");
  }

  if (c.req.query("error")) {
    return jsonError(c, 400, "Google OAuth was cancelled");
  }

  const code = c.req.query("code");
  if (!code) {
    return jsonError(c, 400, "Missing OAuth code");
  }

  return c.json(
    {
      error: "Google OAuth token exchange is a follow-up TODO in this MVP skeleton",
      next: "Exchange the code, verify id_token, upsert users, create a hashed session token, and redirect to the app.",
    },
    501,
  );
});

app.get("/api/me", async (c) => {
  const user = await getCurrentUser(c);
  return c.json({ user });
});

app.post("/api/logout", async (c) => {
  await revokeSession(c);
  return c.json({ ok: true });
});

app.use("/api/rooms/*", requireUser);
app.use("/api/logo/*", requireUser);

app.post("/api/rooms/personal", async (c) => {
  const parsed = await parseJson(c, createPersonalRoomSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const user = c.get("user");
  const room = await createRoom(c, user, {
    name: parsed.data.name,
    type: "personal",
    joinEnabled: false,
    displayName: parsed.data.displayName,
  });

  return c.json({ room }, 201);
});

app.post("/api/rooms", async (c) => {
  const parsed = await parseJson(c, createSharedRoomSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const user = c.get("user");
  const salt = randomTokenHex(16);
  const passphrase = await hashRoomPassphrase(parsed.data.passphrase, salt);
  const room = await createRoom(c, user, {
    name: parsed.data.name,
    type: "shared",
    joinEnabled: true,
    displayName: parsed.data.displayName,
    passphraseHash: passphrase.hash,
    passphraseSalt: passphrase.salt,
  });

  return c.json({ room }, 201);
});

app.post("/api/rooms/join", async (c) => {
  const parsed = await parseJson(c, joinRoomSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  if (!parsed.data.roomId && !parsed.data.roomCode) {
    return jsonError(c, 400, "roomId or roomCode is required");
  }

  const room = parsed.data.roomId
    ? await c.env.DB.prepare(
        "SELECT id, name, type, join_enabled, passphrase_hash, passphrase_salt FROM rooms WHERE id = ? LIMIT 1",
      )
        .bind(parsed.data.roomId)
        .first<JoinableRoomRow>()
    : await c.env.DB.prepare(
        "SELECT id, name, type, join_enabled, passphrase_hash, passphrase_salt FROM rooms WHERE room_code = ? LIMIT 1",
      )
        .bind(parsed.data.roomCode)
        .first<JoinableRoomRow>();

  if (!room || room.type !== "shared" || room.join_enabled !== 1 || !room.passphrase_hash || !room.passphrase_salt) {
    return jsonError(c, 404, "Room not found");
  }

  const validPassphrase = await verifyRoomPassphrase(
    parsed.data.passphrase,
    room.passphrase_salt,
    room.passphrase_hash,
  );
  if (!validPassphrase) {
    return jsonError(c, 403, "Invalid room passphrase");
  }

  const user = c.get("user");
  const existing = await c.env.DB.prepare("SELECT room_id FROM room_members WHERE room_id = ? AND user_id = ?")
    .bind(room.id, user.id)
    .first<{ room_id: string }>();
  if (existing) {
    return c.json({ roomId: room.id, joined: false });
  }

  await c.env.DB.prepare(
    `INSERT INTO room_members
      (room_id, user_id, display_name_in_room, avatar_kind, avatar_emoji, avatar_color, avatar_r2_key, avatar_thumb_r2_key, role, joined_at)
     VALUES (?, ?, ?, 'initials', NULL, 'indigo', NULL, NULL, 'member', ?)`,
  )
    .bind(room.id, user.id, parsed.data.displayName ?? user.name, nowIso())
    .run();

  return c.json({ roomId: room.id, joined: true }, 201);
});

app.get("/api/rooms/:roomId", async (c) => {
  const roomId = c.req.param("roomId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }

  const room = await c.env.DB.prepare(
    `SELECT id, room_code, name, type, join_enabled, owner_user_id, created_at, updated_at
     FROM rooms WHERE id = ? LIMIT 1`,
  )
    .bind(roomId)
    .first();

  return c.json({ room, role: membership.member.role });
});

app.patch("/api/rooms/:roomId", async (c) => {
  const roomId = c.req.param("roomId");
  const membership = await requireRoomMember(c, roomId, "owner");
  if (!membership.ok) {
    return membership.response;
  }
  const parsed = await parseJson(c, patchRoomSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  if (parsed.data.name) {
    await c.env.DB.prepare("UPDATE rooms SET name = ?, updated_at = ? WHERE id = ?")
      .bind(parsed.data.name, nowIso(), roomId)
      .run();
  }

  return c.json({ ok: true });
});

app.post("/api/rooms/:roomId/convert-to-shared", async (c) => {
  const roomId = c.req.param("roomId");
  const membership = await requireRoomMember(c, roomId, "owner");
  if (!membership.ok) {
    return membership.response;
  }
  const parsed = await parseJson(c, rotatePassphraseSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const salt = randomTokenHex(16);
  const passphrase = await hashRoomPassphrase(parsed.data.passphrase, salt);
  await c.env.DB.prepare(
    `UPDATE rooms
     SET type = 'shared', join_enabled = 1, passphrase_hash = ?, passphrase_salt = ?, updated_at = ?
     WHERE id = ?`,
  )
    .bind(passphrase.hash, passphrase.salt, nowIso(), roomId)
    .run();

  return c.json({ ok: true });
});

app.post("/api/rooms/:roomId/rotate-passphrase", async (c) => {
  const roomId = c.req.param("roomId");
  const membership = await requireRoomMember(c, roomId, "owner");
  if (!membership.ok) {
    return membership.response;
  }
  const parsed = await parseJson(c, rotatePassphraseSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const salt = randomTokenHex(16);
  const passphrase = await hashRoomPassphrase(parsed.data.passphrase, salt);
  await c.env.DB.prepare("UPDATE rooms SET passphrase_hash = ?, passphrase_salt = ?, updated_at = ? WHERE id = ?")
    .bind(passphrase.hash, passphrase.salt, nowIso(), roomId)
    .run();

  return c.json({ ok: true });
});

app.get("/api/rooms/:roomId/members", async (c) => {
  const roomId = c.req.param("roomId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  const result = await c.env.DB.prepare(
    `SELECT user_id, display_name_in_room, avatar_kind, avatar_emoji, avatar_color, avatar_thumb_r2_key, role, joined_at
     FROM room_members
     WHERE room_id = ?
     ORDER BY joined_at ASC`,
  )
    .bind(roomId)
    .all();
  return c.json({ members: result.results ?? [] });
});

app.put("/api/rooms/:roomId/members/:userId/avatar", async (c) => {
  const roomId = c.req.param("roomId");
  const targetUserId = c.req.param("userId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  if (targetUserId !== c.get("user").id) {
    return jsonError(c, 403, "Users can update only their own avatar");
  }

  const target = await readMemberAvatar(c, roomId, targetUserId);
  if (!target) {
    return jsonError(c, 404, "Room member not found");
  }

  const contentType = c.req.header("content-type")?.split(";")[0]?.toLowerCase();
  if (contentType === "application/json") {
    const parsed = await parseJson(c, avatarJsonSchema);
    if (!parsed.ok) {
      return parsed.response;
    }
    if (target.avatar_r2_key) {
      await c.env.AVATAR_BUCKET.delete(target.avatar_r2_key);
    }
    const avatarText = parsed.data.kind === "emoji" ? parsed.data.emoji : parsed.data.initials;
    await c.env.DB.prepare(
      `UPDATE room_members
       SET avatar_kind = ?, avatar_emoji = ?, avatar_color = ?, avatar_r2_key = NULL, avatar_thumb_r2_key = NULL
       WHERE room_id = ? AND user_id = ?`,
    )
      .bind(parsed.data.kind, avatarText, parsed.data.color ?? "indigo", roomId, targetUserId)
      .run();
    return c.json({ avatarKind: parsed.data.kind });
  }

  if (!contentType || !allowedAvatarTypes.has(contentType)) {
    return jsonError(c, 415, "Unsupported avatar content type");
  }

  const maxBytes = getOptionalNumber(c.env.MAX_AVATAR_UPLOAD_BYTES, 1024 * 1024);
  const contentLength = Number(c.req.header("content-length"));
  if (!Number.isFinite(contentLength) || contentLength <= 0) {
    return jsonError(c, 411, "Avatar upload requires Content-Length");
  }
  if (contentLength > maxBytes) {
    return jsonError(c, 413, "Avatar upload is too large");
  }

  const bytes = await c.req.arrayBuffer();
  if (bytes.byteLength > maxBytes) {
    return jsonError(c, 413, "Avatar upload is too large");
  }

  const extension = allowedAvatarTypes.get(contentType) ?? "bin";
  const objectKey = `avatars/${roomId}/${targetUserId}/${crypto.randomUUID()}.${extension}`;
  await c.env.AVATAR_BUCKET.put(objectKey, bytes, {
    httpMetadata: { contentType },
    customMetadata: { roomId, userId: targetUserId },
  });
  if (target.avatar_r2_key) {
    await c.env.AVATAR_BUCKET.delete(target.avatar_r2_key);
  }
  await c.env.DB.prepare(
    `UPDATE room_members
     SET avatar_kind = 'photo', avatar_emoji = NULL, avatar_r2_key = ?, avatar_thumb_r2_key = NULL
     WHERE room_id = ? AND user_id = ?`,
  )
    .bind(objectKey, roomId, targetUserId)
    .run();

  return c.json({ avatarKind: "photo", avatarUrl: `/api/rooms/${roomId}/members/${targetUserId}/avatar` });
});

app.get("/api/rooms/:roomId/members/:userId/avatar", async (c) => {
  const roomId = c.req.param("roomId");
  const targetUserId = c.req.param("userId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  const target = await readMemberAvatar(c, roomId, targetUserId);
  if (!target?.avatar_r2_key) {
    return jsonError(c, 404, "Avatar photo not found");
  }

  const object = await c.env.AVATAR_BUCKET.get(target.avatar_r2_key);
  if (!object) {
    return jsonError(c, 404, "Avatar photo not found");
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, max-age=300");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
});

app.delete("/api/rooms/:roomId/members/:userId/avatar", async (c) => {
  const roomId = c.req.param("roomId");
  const targetUserId = c.req.param("userId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  if (targetUserId !== c.get("user").id) {
    return jsonError(c, 403, "Users can delete only their own avatar");
  }

  const target = await readMemberAvatar(c, roomId, targetUserId);
  if (target?.avatar_r2_key) {
    await c.env.AVATAR_BUCKET.delete(target.avatar_r2_key);
  }
  await c.env.DB.prepare(
    `UPDATE room_members
     SET avatar_kind = 'initials', avatar_emoji = NULL, avatar_r2_key = NULL, avatar_thumb_r2_key = NULL
     WHERE room_id = ? AND user_id = ?`,
  )
    .bind(roomId, targetUserId)
    .run();
  return c.json({ ok: true });
});

app.get("/api/rooms/:roomId/companies", async (c) => {
  const roomId = c.req.param("roomId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  const result = await c.env.DB.prepare(
    `SELECT id, name, domain, career_url, mypage_url, logo_url, memo, created_at, updated_at
     FROM companies
     WHERE room_id = ? AND deleted_at IS NULL
     ORDER BY name ASC`,
  )
    .bind(roomId)
    .all();
  return c.json({ companies: result.results ?? [] });
});

app.post("/api/rooms/:roomId/companies", async (c) => {
  const roomId = c.req.param("roomId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  const parsed = await parseJson(c, companyCreateSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  const now = nowIso();
  const id = randomId("company");
  await c.env.DB.prepare(
    `INSERT INTO companies
      (id, room_id, name, domain, career_url, mypage_url, logo_url, logo_r2_key, memo, created_by_user_id, deleted_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, NULL, ?, ?)`,
  )
    .bind(
      id,
      roomId,
      parsed.data.name,
      parsed.data.domain ?? null,
      parsed.data.careerUrl ?? null,
      parsed.data.mypageUrl ?? null,
      parsed.data.logoUrl ?? null,
      parsed.data.memo ?? null,
      c.get("user").id,
      now,
      now,
    )
    .run();

  return c.json({ companyId: id }, 201);
});

app.get("/api/rooms/:roomId/companies/:companyId", async (c) => {
  const roomId = c.req.param("roomId");
  const companyId = c.req.param("companyId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  const company = await c.env.DB.prepare(
    `SELECT id, name, domain, career_url, mypage_url, logo_url, memo, created_at, updated_at
     FROM companies
     WHERE id = ? AND room_id = ? AND deleted_at IS NULL
     LIMIT 1`,
  )
    .bind(companyId, roomId)
    .first();
  if (!company) {
    return jsonError(c, 404, "Company not found");
  }
  return c.json({ company });
});

app.patch("/api/rooms/:roomId/companies/:companyId", async (c) => {
  const roomId = c.req.param("roomId");
  const companyId = c.req.param("companyId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  const parsed = await parseJson(c, companyPatchSchema);
  if (!parsed.ok) {
    return parsed.response;
  }
  const existing = await c.env.DB.prepare(
    "SELECT name, domain, career_url, mypage_url, logo_url, memo FROM companies WHERE id = ? AND room_id = ? AND deleted_at IS NULL",
  )
    .bind(companyId, roomId)
    .first<CompanyRow>();
  if (!existing) {
    return jsonError(c, 404, "Company not found");
  }

  await c.env.DB.prepare(
    `UPDATE companies
     SET name = ?, domain = ?, career_url = ?, mypage_url = ?, logo_url = ?, memo = ?, updated_at = ?
     WHERE id = ? AND room_id = ?`,
  )
    .bind(
      parsed.data.name ?? existing.name,
      parsed.data.domain ?? existing.domain,
      parsed.data.careerUrl ?? existing.career_url,
      parsed.data.mypageUrl ?? existing.mypage_url,
      parsed.data.logoUrl ?? existing.logo_url,
      parsed.data.memo ?? existing.memo,
      nowIso(),
      companyId,
      roomId,
    )
    .run();
  return c.json({ ok: true });
});

app.delete("/api/rooms/:roomId/companies/:companyId", async (c) => {
  const roomId = c.req.param("roomId");
  const companyId = c.req.param("companyId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  await c.env.DB.prepare("UPDATE companies SET deleted_at = ?, updated_at = ? WHERE id = ? AND room_id = ?")
    .bind(nowIso(), nowIso(), companyId, roomId)
    .run();
  return c.json({ ok: true });
});

app.get("/api/rooms/:roomId/companies/:companyId/selection-steps", async (c) => {
  const roomId = c.req.param("roomId");
  const companyId = c.req.param("companyId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  const company = await assertCompanyInRoom(c, roomId, companyId);
  if (!company.ok) {
    return company.response;
  }
  const result = await c.env.DB.prepare(
    `SELECT id, name, step_order, due_at, interview_at, memo, created_at, updated_at
     FROM selection_steps
     WHERE room_id = ? AND company_id = ?
     ORDER BY step_order ASC`,
  )
    .bind(roomId, companyId)
    .all();
  return c.json({ selectionSteps: result.results ?? [] });
});

app.post("/api/rooms/:roomId/selection-steps", async (c) => {
  const roomId = c.req.param("roomId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  const parsed = await parseJson(c, selectionStepSchema);
  if (!parsed.ok) {
    return parsed.response;
  }
  const company = await assertCompanyInRoom(c, roomId, parsed.data.companyId);
  if (!company.ok) {
    return company.response;
  }

  const now = nowIso();
  const id = randomId("step");
  await c.env.DB.prepare(
    `INSERT INTO selection_steps
      (id, room_id, company_id, name, step_order, due_at, interview_at, memo, created_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      roomId,
      parsed.data.companyId,
      parsed.data.name,
      parsed.data.stepOrder,
      parsed.data.dueAt ?? null,
      parsed.data.interviewAt ?? null,
      parsed.data.memo ?? null,
      c.get("user").id,
      now,
      now,
    )
    .run();
  return c.json({ selectionStepId: id }, 201);
});

app.get("/api/rooms/:roomId/companies/:companyId/test-reports", async (c) => {
  const roomId = c.req.param("roomId");
  const companyId = c.req.param("companyId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  const company = await assertCompanyInRoom(c, roomId, companyId);
  if (!company.ok) {
    return company.response;
  }
  const result = await c.env.DB.prepare(
    `SELECT id, test_type_id, source, notes, visibility, created_by_user_id, created_at, updated_at
     FROM company_test_reports
     WHERE room_id = ? AND company_id = ?
       AND (visibility = 'room' OR created_by_user_id = ?)
     ORDER BY updated_at DESC`,
  )
    .bind(roomId, companyId, c.get("user").id)
    .all();
  return c.json({ testReports: result.results ?? [] });
});

app.post("/api/rooms/:roomId/test-reports", async (c) => {
  const roomId = c.req.param("roomId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  const parsed = await parseJson(c, testReportSchema);
  if (!parsed.ok) {
    return parsed.response;
  }
  const company = await assertCompanyInRoom(c, roomId, parsed.data.companyId);
  if (!company.ok) {
    return company.response;
  }

  const now = nowIso();
  const id = randomId("test_report");
  await c.env.DB.prepare(
    `INSERT INTO company_test_reports
      (id, room_id, company_id, test_type_id, source, notes, visibility, created_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      roomId,
      parsed.data.companyId,
      parsed.data.testTypeId ?? null,
      parsed.data.source ?? null,
      parsed.data.notes ?? null,
      parsed.data.visibility,
      c.get("user").id,
      now,
      now,
    )
    .run();
  return c.json({ testReportId: id }, 201);
});

app.get("/api/rooms/:roomId/progress", async (c) => {
  const roomId = c.req.param("roomId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  const userId = c.get("user").id;
  const applications = await c.env.DB.prepare(
    `SELECT applications.id, applications.company_id, companies.name AS company_name,
            applications.user_id, applications.overall_status, applications.visibility,
            applications.mypage_url, applications.created_at, applications.updated_at
     FROM applications
     INNER JOIN companies ON companies.id = applications.company_id
     WHERE applications.room_id = ?
       AND companies.deleted_at IS NULL
       AND (applications.visibility = 'room' OR applications.user_id = ?)
     ORDER BY applications.updated_at DESC`,
  )
    .bind(roomId, userId)
    .all();
  return c.json({ applications: applications.results ?? [] });
});

app.post("/api/rooms/:roomId/applications", async (c) => {
  const roomId = c.req.param("roomId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  const parsed = await parseJson(c, applicationCreateSchema);
  if (!parsed.ok) {
    return parsed.response;
  }
  const company = await assertCompanyInRoom(c, roomId, parsed.data.companyId);
  if (!company.ok) {
    return company.response;
  }

  const now = nowIso();
  const id = randomId("application");
  await c.env.DB.prepare(
    `INSERT INTO applications
      (id, room_id, company_id, user_id, overall_status, visibility, mypage_url, personal_note_encrypted, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      roomId,
      parsed.data.companyId,
      c.get("user").id,
      parsed.data.overallStatus,
      parsed.data.visibility,
      parsed.data.mypageUrl ?? null,
      parsed.data.personalNoteEncrypted ?? null,
      now,
      now,
    )
    .run();
  return c.json({ applicationId: id }, 201);
});

app.patch("/api/rooms/:roomId/applications/:applicationId", async (c) => {
  const roomId = c.req.param("roomId");
  const applicationId = c.req.param("applicationId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  const userId = c.get("user").id;
  const existing = await c.env.DB.prepare(
    `SELECT overall_status, visibility, mypage_url, personal_note_encrypted
     FROM applications
     WHERE id = ? AND room_id = ? AND user_id = ?
     LIMIT 1`,
  )
    .bind(applicationId, roomId, userId)
    .first<ApplicationRow>();
  if (!existing) {
    return jsonError(c, 404, "Application not found");
  }

  const parsed = await parseJson(c, applicationPatchSchema);
  if (!parsed.ok) {
    return parsed.response;
  }
  await c.env.DB.prepare(
    `UPDATE applications
     SET overall_status = ?, visibility = ?, mypage_url = ?, personal_note_encrypted = ?, updated_at = ?
     WHERE id = ? AND room_id = ? AND user_id = ?`,
  )
    .bind(
      parsed.data.overallStatus ?? existing.overall_status,
      parsed.data.visibility ?? existing.visibility,
      parsed.data.mypageUrl ?? existing.mypage_url,
      parsed.data.personalNoteEncrypted ?? existing.personal_note_encrypted,
      nowIso(),
      applicationId,
      roomId,
      userId,
    )
    .run();
  return c.json({ ok: true });
});

app.get("/api/rooms/:roomId/dashboard", async (c) => {
  const roomId = c.req.param("roomId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  const userId = c.get("user").id;
  const counts = await c.env.DB.prepare(
    `SELECT
       (SELECT COUNT(*) FROM companies WHERE room_id = ? AND deleted_at IS NULL) AS companies,
       (SELECT COUNT(*) FROM room_members WHERE room_id = ?) AS members,
       (SELECT COUNT(*) FROM applications WHERE room_id = ? AND (visibility = 'room' OR user_id = ?)) AS applications`,
  )
    .bind(roomId, roomId, roomId, userId)
    .first();
  return c.json({ counts });
});

app.get("/api/rooms/:roomId/events", async (c) => {
  const roomId = c.req.param("roomId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  const userId = c.get("user").id;
  const result = await c.env.DB.prepare(
    `SELECT id, company_id, application_id, user_id, title, starts_at, ends_at, visibility, kind, created_at, updated_at
     FROM events
     WHERE room_id = ? AND (visibility = 'room' OR user_id = ?)
     ORDER BY starts_at ASC`,
  )
    .bind(roomId, userId)
    .all();
  return c.json({ events: result.results ?? [] });
});

app.post("/api/rooms/:roomId/events", async (c) => createEventOrTask(c, "event"));

app.get("/api/rooms/:roomId/tasks", async (c) => {
  const roomId = c.req.param("roomId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  const userId = c.get("user").id;
  const result = await c.env.DB.prepare(
    `SELECT id, company_id, application_id, user_id, title, due_at, status, visibility, created_at, updated_at
     FROM tasks
     WHERE room_id = ? AND (visibility = 'room' OR user_id = ?)
     ORDER BY due_at ASC`,
  )
    .bind(roomId, userId)
    .all();
  return c.json({ tasks: result.results ?? [] });
});

app.post("/api/rooms/:roomId/tasks", async (c) => createEventOrTask(c, "task"));

app.get("/api/rooms/:roomId/vault/items", async (c) => {
  const roomId = c.req.param("roomId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  const result = await c.env.DB.prepare(
    `SELECT id, application_id, encrypted_payload, created_at, updated_at
     FROM credential_items
     WHERE room_id = ? AND owner_user_id = ?
     ORDER BY updated_at DESC`,
  )
    .bind(roomId, c.get("user").id)
    .all();
  return c.json({ credentialItems: result.results ?? [] });
});

app.post("/api/rooms/:roomId/vault/items", async (c) => {
  const roomId = c.req.param("roomId");
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }
  const parsed = await parseJson(c, vaultItemCreateSchema);
  if (!parsed.ok) {
    return parsed.response;
  }

  if (parsed.data.applicationId) {
    const application = await c.env.DB.prepare(
      "SELECT id FROM applications WHERE id = ? AND room_id = ? AND user_id = ? LIMIT 1",
    )
      .bind(parsed.data.applicationId, roomId, c.get("user").id)
      .first<{ id: string }>();
    if (!application) {
      return jsonError(c, 404, "Application not found");
    }
  }

  const now = nowIso();
  const id = randomId("credential");
  await c.env.DB.prepare(
    `INSERT INTO credential_items
      (id, owner_user_id, room_id, application_id, encrypted_payload, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(id, c.get("user").id, roomId, parsed.data.applicationId ?? null, parsed.data.encryptedPayload, now, now)
    .run();
  return c.json({ credentialItemId: id }, 201);
});

app.get("/api/logo/resolve", async (c) => {
  const domain = c.req.query("domain")?.trim().toLowerCase();
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return jsonError(c, 400, "Valid domain is required");
  }
  const cached = await c.env.DB.prepare(
    "SELECT domain, source, logo_url, r2_key, metadata_json, updated_at FROM logo_cache WHERE domain = ? LIMIT 1",
  )
    .bind(domain)
    .first();
  return c.json({
    domain,
    cached,
    status: cached ? "cached" : "manual-or-provider-todo",
  });
});

app.notFound((c) => jsonError(c, 404, "Not found"));

async function createRoom(
  c: AppContext,
  user: User,
  input: {
    name: string;
    type: "personal" | "shared";
    joinEnabled: boolean;
    displayName?: string;
    passphraseHash?: string;
    passphraseSalt?: string;
  },
): Promise<{ id: string; roomCode: string; name: string; type: "personal" | "shared" }> {
  const now = nowIso();
  const roomId = randomId("room");
  const roomCode = `rm_${randomTokenHex(5)}`;

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO rooms
        (id, room_code, name, type, join_enabled, passphrase_hash, passphrase_salt, owner_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      roomId,
      roomCode,
      input.name,
      input.type,
      input.joinEnabled ? 1 : 0,
      input.passphraseHash ?? null,
      input.passphraseSalt ?? null,
      user.id,
      now,
      now,
    ),
    c.env.DB.prepare(
      `INSERT INTO room_members
        (room_id, user_id, display_name_in_room, avatar_kind, avatar_emoji, avatar_color, avatar_r2_key, avatar_thumb_r2_key, role, joined_at)
       VALUES (?, ?, ?, 'initials', NULL, 'teal', NULL, NULL, 'owner', ?)`,
    ).bind(roomId, user.id, input.displayName ?? user.name, now),
  ]);

  return { id: roomId, roomCode, name: input.name, type: input.type };
}

async function readMemberAvatar(
  c: AppContext,
  roomId: string,
  userId: string,
): Promise<{ avatar_r2_key: string | null } | null> {
  return c.env.DB.prepare(
    "SELECT avatar_r2_key FROM room_members WHERE room_id = ? AND user_id = ? LIMIT 1",
  )
    .bind(roomId, userId)
    .first<{ avatar_r2_key: string | null }>();
}

async function createEventOrTask(c: AppContext, kind: "event" | "task"): Promise<Response> {
  const roomId = c.req.param("roomId");
  if (!roomId) {
    return jsonError(c, 400, "roomId is required");
  }
  const membership = await requireRoomMember(c, roomId);
  if (!membership.ok) {
    return membership.response;
  }

  if (kind === "event") {
    const parsed = await parseJson(c, eventCreateSchema);
    if (!parsed.ok) {
      return parsed.response;
    }
    const now = nowIso();
    const id = randomId("event");
    await c.env.DB.prepare(
      `INSERT INTO events
        (id, room_id, company_id, application_id, user_id, title, starts_at, ends_at, visibility, kind, notes_encrypted, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(
        id,
        roomId,
        parsed.data.companyId ?? null,
        parsed.data.applicationId ?? null,
        c.get("user").id,
        parsed.data.title,
        parsed.data.startsAt,
        parsed.data.endsAt ?? null,
        parsed.data.visibility,
        parsed.data.kind,
        parsed.data.notesEncrypted ?? null,
        now,
        now,
      )
      .run();
    return c.json({ eventId: id }, 201);
  }

  const parsed = await parseJson(c, taskCreateSchema);
  if (!parsed.ok) {
    return parsed.response;
  }
  const now = nowIso();
  const id = randomId("task");
  await c.env.DB.prepare(
    `INSERT INTO tasks
      (id, room_id, company_id, application_id, user_id, title, due_at, status, visibility, notes_encrypted, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      id,
      roomId,
      parsed.data.companyId ?? null,
      parsed.data.applicationId ?? null,
      c.get("user").id,
      parsed.data.title,
      parsed.data.dueAt ?? null,
      parsed.data.status,
      parsed.data.visibility,
      parsed.data.notesEncrypted ?? null,
      now,
      now,
    )
    .run();
  return c.json({ taskId: id }, 201);
}

type JoinableRoomRow = {
  id: string;
  name: string;
  type: "personal" | "shared";
  join_enabled: 0 | 1;
  passphrase_hash: string | null;
  passphrase_salt: string | null;
};

type CompanyRow = {
  name: string;
  domain: string | null;
  career_url: string | null;
  mypage_url: string | null;
  logo_url: string | null;
  memo: string | null;
};

type ApplicationRow = {
  overall_status: string;
  visibility: "room" | "private";
  mypage_url: string | null;
  personal_note_encrypted: string | null;
};

export default app;
