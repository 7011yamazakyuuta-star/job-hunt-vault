import { pbkdf2Sha256Hex, sha256Hex, timingSafeEqualText } from "./crypto";
import { jsonError } from "./http";
import type { AppContext, RoomMember } from "./types";

const ROOM_PASSPHRASE_ITERATIONS = 120000;

export async function hashRoomPassphrase(
  passphrase: string,
  salt: string,
): Promise<{ hash: string; salt: string }> {
  return {
    salt,
    hash: `pbkdf2-sha256:${ROOM_PASSPHRASE_ITERATIONS}:${await pbkdf2Sha256Hex(
      passphrase,
      salt,
      ROOM_PASSPHRASE_ITERATIONS,
    )}`,
  };
}

export async function verifyRoomPassphrase(
  passphrase: string,
  salt: string,
  expectedHash: string,
): Promise<boolean> {
  const parsed = parsePassphraseHash(expectedHash);
  if (parsed) {
    const candidate = `pbkdf2-sha256:${parsed.iterations}:${await pbkdf2Sha256Hex(
      passphrase,
      salt,
      parsed.iterations,
    )}`;
    return timingSafeEqualText(candidate, expectedHash);
  }

  // Legacy compatibility for pre-PBKDF2 skeleton data.
  const legacyCandidate = await sha256Hex(`${salt}:${passphrase}`);
  if (await timingSafeEqualText(legacyCandidate, expectedHash)) {
    return true;
  }
  const candidate = await hashRoomPassphrase(passphrase, salt);
  return timingSafeEqualText(candidate.hash, expectedHash);
}

function parsePassphraseHash(hash: string): { iterations: number } | null {
  const [algorithm, iterationsText, digest] = hash.split(":");
  const iterations = Number(iterationsText);
  if (algorithm !== "pbkdf2-sha256" || !Number.isInteger(iterations) || iterations < 10000 || !digest) {
    return null;
  }
  return { iterations };
}

export async function requireRoomMember(
  c: AppContext,
  roomId: string,
  requiredRole?: "owner",
): Promise<{ ok: true; member: RoomMember } | { ok: false; response: Response }> {
  const user = c.get("user");
  const member = await c.env.DB.prepare(
    `SELECT room_id, user_id, role, avatar_r2_key
     FROM room_members
     WHERE room_id = ? AND user_id = ?
     LIMIT 1`,
  )
    .bind(roomId, user.id)
    .first<RoomMember>();

  if (!member) {
    return { ok: false, response: jsonError(c, 404, "Room not found") };
  }

  if (requiredRole === "owner" && member.role !== "owner") {
    return { ok: false, response: jsonError(c, 403, "Room owner permission required") };
  }

  return { ok: true, member };
}

export async function assertCompanyInRoom(
  c: AppContext,
  roomId: string,
  companyId: string,
): Promise<{ ok: true } | { ok: false; response: Response }> {
  const company = await c.env.DB.prepare(
    "SELECT id FROM companies WHERE id = ? AND room_id = ? AND deleted_at IS NULL LIMIT 1",
  )
    .bind(companyId, roomId)
    .first<{ id: string }>();
  if (!company) {
    return { ok: false, response: jsonError(c, 404, "Company not found") };
  }
  return { ok: true };
}
