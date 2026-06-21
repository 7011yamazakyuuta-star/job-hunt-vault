import { describe, expect, it } from "vitest";
import { base64UrlEncode, encodeUtf8, toArrayBuffer } from "./crypto";
import { OAuthVerificationError, verifyGoogleIdToken } from "./oauth";

const clientId = "test-client-id.apps.googleusercontent.com";

describe("Google OAuth id_token verification", () => {
  it("verifies a signed Google id_token and returns the profile", async () => {
    const { token, jwk } = await createSignedIdToken({ aud: clientId });
    const fetchJwks = async () => Response.json({ keys: [jwk] });

    const profile = await verifyGoogleIdToken(token, clientId, fetchJwks);

    expect(profile).toEqual({
      sub: "google-user-1",
      email: "student@example.com",
      name: "Student User",
      picture: "https://example.com/avatar.png",
    });
  });

  it("rejects tokens for another OAuth client", async () => {
    const { token, jwk } = await createSignedIdToken({ aud: "other-client-id" });
    const fetchJwks = async () => Response.json({ keys: [jwk] });

    await expect(verifyGoogleIdToken(token, clientId, fetchJwks)).rejects.toBeInstanceOf(OAuthVerificationError);
  });
});

async function createSignedIdToken(
  overrides: Partial<TestJwtPayload>,
): Promise<{ token: string; jwk: JsonWebKey & { kid: string; alg: string; use: string } }> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );

  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const kid = "test-key-id";
  const header = { alg: "RS256", kid, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload: TestJwtPayload = {
    iss: "https://accounts.google.com",
    aud: clientId,
    exp: now + 600,
    iat: now,
    sub: "google-user-1",
    email: "student@example.com",
    email_verified: true,
    name: "Student User",
    picture: "https://example.com/avatar.png",
    ...overrides,
  };

  const encodedHeader = base64UrlEncode(encodeUtf8(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(encodeUtf8(JSON.stringify(payload)));
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    keyPair.privateKey,
    toArrayBuffer(encodeUtf8(signingInput)),
  );

  return {
    token: `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`,
    jwk: {
      ...publicJwk,
      kid,
      alg: "RS256",
      use: "sig",
    },
  };
}

type TestJwtPayload = {
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
};
