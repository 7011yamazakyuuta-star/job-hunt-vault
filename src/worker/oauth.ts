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
  readonly failureCode: string;
  readonly metadata: Record<string, string | number | boolean | null>;

  constructor(message: string, failureCode = "google_verification_failed", metadata: Record<string, string | number | boolean | null> = {}) {
    super(message);
    this.name = "OAuthVerificationError";
    this.failureCode = failureCode;
    this.metadata = metadata;
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
    const googleError = await readGoogleTokenError(response);
    throw new OAuthVerificationError(
      googleError.error ? `Google token exchange failed: ${googleError.error}` : "Google token exchange failed",
      "token_exchange_failed",
      {
        status: response.status,
        googleError: googleError.error,
        googleErrorDescription: googleError.description,
      },
    );
  }

  const parsed = tokenResponseSchema.safeParse(await response.json());
  if (!parsed.success) {
    throw new OAuthVerificationError(
      "Google token response did not include a valid id_token",
      "token_response_invalid",
    );
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
    throw new OAuthVerificationError("Malformed id_token", "id_token_malformed");
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new OAuthVerificationError("Malformed id_token", "id_token_malformed");
  }

  const header = parseJwtPart(encodedHeader, jwtHeaderSchema);
  const payload = parseJwtPart(encodedPayload, jwtPayloadSchema);

  const jwksResponse = await fetchJwks(GOOGLE_JWKS_URL, {
    headers: {
      Accept: "application/json",
    },
  });
  if (!jwksResponse.ok) {
    throw new OAuthVerificationError("Google JWKS fetch failed", "jwks_fetch_failed");
  }

  const jwks = jwksSchema.safeParse(await jwksResponse.json());
  if (!jwks.success) {
    throw new OAuthVerificationError("Google JWKS response was invalid", "jwks_response_invalid");
  }

  const jwk = jwks.data.keys.find((candidate) => candidate.kid === header.kid);
  if (!jwk) {
    throw new OAuthVerificationError("Google signing key was not found", "jwks_key_not_found");
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
    throw new OAuthVerificationError("Google id_token signature was invalid", "id_token_signature_invalid");
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
    throw new OAuthVerificationError("Malformed id_token JSON", "id_token_json_malformed");
  }

  const parsed = schema.safeParse(decoded);
  if (!parsed.success) {
    throw new OAuthVerificationError("Malformed id_token claims", "id_token_claims_invalid");
  }
  return parsed.data;
}

function validateGooglePayload(payload: z.infer<typeof jwtPayloadSchema>, clientId: string): void {
  const now = Math.floor(Date.now() / 1000);

  if (!GOOGLE_ISSUERS.has(payload.iss)) {
    throw new OAuthVerificationError("Google id_token issuer was invalid", "id_token_issuer_invalid");
  }
  if (payload.aud !== clientId) {
    throw new OAuthVerificationError("Google id_token audience was invalid", "id_token_audience_invalid");
  }
  if (payload.exp <= now - CLOCK_SKEW_SECONDS) {
    throw new OAuthVerificationError("Google id_token expired", "id_token_expired");
  }
  if (payload.iat && payload.iat > now + CLOCK_SKEW_SECONDS) {
    throw new OAuthVerificationError("Google id_token was issued in the future", "id_token_issued_in_future");
  }

  const emailVerified = payload.email_verified === true || payload.email_verified === "true";
  if (!emailVerified) {
    throw new OAuthVerificationError("Google email was not verified", "google_email_unverified");
  }
}

async function readGoogleTokenError(response: Response): Promise<{ error: string | null; description: string | null }> {
  try {
    const body = (await response.json()) as { error?: unknown; error_description?: unknown };
    return {
      error: typeof body.error === "string" ? sanitizeOAuthLogValue(body.error) : null,
      description:
        typeof body.error_description === "string" ? sanitizeOAuthLogValue(body.error_description) : null,
    };
  } catch {
    return { error: null, description: null };
  }
}

function sanitizeOAuthLogValue(value: string): string {
  return value.replaceAll(/[^a-zA-Z0-9 _.:/-]/g, "").slice(0, 180);
}
