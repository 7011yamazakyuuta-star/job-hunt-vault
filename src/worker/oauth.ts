import { z } from "zod";
import { base64UrlDecode, decodeUtf8, encodeUtf8, toArrayBuffer } from "./crypto";
import { getSecret } from "./secrets";
import type { GoogleUserProfile } from "./auth";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const GOOGLE_ISSUERS = new Set(["https://accounts.google.com", "accounts.google.com"]);
const CLOCK_SKEW_SECONDS = 300;

const tokenResponseSchema = z.object({
  id_token: z.string().min(1),
  access_token: z.string().optional(),
  expires_in: z.number().optional(),
  scope: z.string().optional(),
  token_type: z.string().optional(),
});

const jwtHeaderSchema = z.object({
  alg: z.literal("RS256"),
  kid: z.string().min(1),
  typ: z.string().optional(),
});

const jwtPayloadSchema = z.object({
  iss: z.string().min(1),
  aud: z.string().min(1),
  exp: z.number().int(),
  iat: z.number().int().optional(),
  sub: z.string().min(1),
  email: z.string().email(),
  email_verified: z.union([z.boolean(), z.literal("true"), z.literal("false")]).optional(),
  name: z.string().optional(),
  picture: z.string().optional(),
});

const jwkSchema = z
  .object({
    kty: z.literal("RSA"),
    kid: z.string().min(1),
    use: z.string().optional(),
    alg: z.string().optional(),
    n: z.string().min(1),
    e: z.string().min(1),
  })
  .passthrough();

const jwksSchema = z.object({
  keys: z.array(jwkSchema),
});

export class OAuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OAuthConfigError";
  }
}

export class OAuthVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OAuthVerificationError";
  }
}

export async function exchangeGoogleCodeForProfile(
  env: Env,
  code: string,
  redirectUri: string,
): Promise<GoogleUserProfile> {
  const clientId = getSecret(env, "GOOGLE_CLIENT_ID");
  const clientSecret = getSecret(env, "GOOGLE_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new OAuthConfigError("Google OAuth secrets are not configured");
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    throw new OAuthVerificationError("Google token exchange failed");
  }

  const parsed = tokenResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new OAuthVerificationError("Google token response did not include a valid id_token");
  }

  return verifyGoogleIdToken(parsed.data.id_token, clientId);
}

export async function verifyGoogleIdToken(
  idToken: string,
  clientId: string,
  fetchJwks: typeof fetch = fetch,
): Promise<GoogleUserProfile> {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new OAuthVerificationError("Malformed id_token");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new OAuthVerificationError("Malformed id_token");
  }

  const header = parseJwtPart(encodedHeader, jwtHeaderSchema);
  const payload = parseJwtPart(encodedPayload, jwtPayloadSchema);

  const jwksResponse = await fetchJwks(GOOGLE_JWKS_URL, {
    headers: {
      Accept: "application/json",
    },
  });
  if (!jwksResponse.ok) {
    throw new OAuthVerificationError("Google JWKS fetch failed");
  }

  const jwks = jwksSchema.safeParse(await jwksResponse.json());
  if (!jwks.success) {
    throw new OAuthVerificationError("Google JWKS response was invalid");
  }

  const jwk = jwks.data.keys.find((candidate) => candidate.kid === header.kid);
  if (!jwk) {
    throw new OAuthVerificationError("Google signing key was not found");
  }

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const validSignature = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    toArrayBuffer(base64UrlDecode(encodedSignature)),
    toArrayBuffer(encodeUtf8(signingInput)),
  );

  if (!validSignature) {
    throw new OAuthVerificationError("Google id_token signature was invalid");
  }

  validateGooglePayload(payload, clientId);

  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name?.trim() || payload.email,
    picture: payload.picture ?? null,
  };
}

function parseJwtPart<TSchema extends z.ZodType>(part: string, schema: TSchema): z.infer<TSchema> {
  let decoded: unknown;
  try {
    decoded = JSON.parse(decodeUtf8(base64UrlDecode(part))) as unknown;
  } catch {
    throw new OAuthVerificationError("Malformed id_token JSON");
  }

  const parsed = schema.safeParse(decoded);
  if (!parsed.success) {
    throw new OAuthVerificationError("Malformed id_token claims");
  }
  return parsed.data;
}

function validateGooglePayload(payload: z.infer<typeof jwtPayloadSchema>, clientId: string): void {
  const now = Math.floor(Date.now() / 1000);

  if (!GOOGLE_ISSUERS.has(payload.iss)) {
    throw new OAuthVerificationError("Google id_token issuer was invalid");
  }
  if (payload.aud !== clientId) {
    throw new OAuthVerificationError("Google id_token audience was invalid");
  }
  if (payload.exp <= now - CLOCK_SKEW_SECONDS) {
    throw new OAuthVerificationError("Google id_token expired");
  }
  if (payload.iat && payload.iat > now + CLOCK_SKEW_SECONDS) {
    throw new OAuthVerificationError("Google id_token was issued in the future");
  }

  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  if (!emailVerified) {
    throw new OAuthVerificationError("Google email was not verified");
  }
}
