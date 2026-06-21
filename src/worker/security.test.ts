import { describe, expect, it } from "vitest";
import { randomTokenHex, sha256Hex, timingSafeEqualText } from "./crypto";
import { hashRoomPassphrase, verifyRoomPassphrase } from "./rooms";

describe("security helpers", () => {
  it("hashes values deterministically without returning the original value", async () => {
    const digest = await sha256Hex("session-token");
    expect(digest).toHaveLength(64);
    expect(digest).not.toBe("session-token");
    await expect(timingSafeEqualText(digest, digest)).resolves.toBe(true);
  });

  it("creates high-entropy token material", () => {
    const token = randomTokenHex(32);
    expect(token).toMatch(/^[a-f0-9]{64}$/);
  });

  it("verifies room passphrases against salted hashes", async () => {
    const stored = await hashRoomPassphrase("correct horse battery staple", "fixed-salt");
    await expect(verifyRoomPassphrase("correct horse battery staple", stored.salt, stored.hash)).resolves.toBe(true);
    await expect(verifyRoomPassphrase("wrong passphrase", stored.salt, stored.hash)).resolves.toBe(false);
  });
});
