import { nowIso, randomId } from "./crypto";
import { getSecret } from "./secrets";

const LOGO_DEV_IMAGE_BASE_URL = "https://img.logo.dev";
const LOGO_DEV_API_BASE_URL = "https://api.logo.dev";
const DOMAIN_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

type LogoCacheRow = {
  domain: string;
  source: string;
  logo_url: string | null;
  r2_key: string | null;
  metadata_json: string | null;
  updated_at: string;
};

export type LogoResolveResult = {
  domain: string;
  status: "cached" | "resolved" | "provider-unconfigured";
  source: "cache" | "logo.dev" | "none";
  logoUrl: string | null;
  cached: LogoCacheRow | null;
  provider: {
    name: "logo.dev";
    mode: "domain-image";
    publishableKeyConfigured: boolean;
  };
};

export type LogoSearchResult = {
  name: string;
  domain: string;
  logoUrl: string;
};

export type LogoSearchResponse = {
  status: "ok" | "provider-unconfigured";
  provider: {
    name: "logo.dev";
    mode: "brand-search";
    secretKeyConfigured: boolean;
  };
  results: LogoSearchResult[];
};

type LogoDevSearchResult = {
  name: string;
  domain: string;
  logo_url: string;
};

export function normalizeLogoDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let hostname: string;
  try {
    hostname = new URL(withProtocol).hostname;
  } catch {
    return null;
  }

  const normalized = hostname.replace(/^www\./, "");
  return DOMAIN_PATTERN.test(normalized) ? normalized : null;
}

export function buildLogoDevImageUrl(domain: string, publishableKey: string): string {
  const url = new URL(`${LOGO_DEV_IMAGE_BASE_URL}/${encodeURIComponent(domain)}`);
  url.searchParams.set("token", publishableKey);
  url.searchParams.set("format", "png");
  url.searchParams.set("size", "96");
  url.searchParams.set("retina", "true");
  return url.toString();
}

export async function resolveLogoForDomain(env: Env, db: D1Database, domain: string): Promise<LogoResolveResult> {
  const cached = await db
    .prepare("SELECT domain, source, logo_url, r2_key, metadata_json, updated_at FROM logo_cache WHERE domain = ? LIMIT 1")
    .bind(domain)
    .first<LogoCacheRow>();

  if (cached?.logo_url) {
    return {
      domain,
      status: "cached",
      source: "cache",
      logoUrl: cached.logo_url,
      cached,
      provider: logoDevDomainProvider(env),
    };
  }

  const publishableKey = getSecret(env, "LOGO_DEV_PUBLISHABLE_KEY");
  if (!publishableKey) {
    return {
      domain,
      status: "provider-unconfigured",
      source: "none",
      logoUrl: null,
      cached: cached ?? null,
      provider: logoDevDomainProvider(env),
    };
  }

  const logoUrl = buildLogoDevImageUrl(domain, publishableKey);
  const now = nowIso();
  await db
    .prepare(
      `INSERT INTO logo_cache
        (id, domain, source, logo_url, r2_key, metadata_json, created_at, updated_at)
       VALUES (?, ?, 'logo.dev', ?, NULL, ?, ?, ?)
       ON CONFLICT(domain) DO UPDATE SET
        source = excluded.source,
        logo_url = excluded.logo_url,
        metadata_json = excluded.metadata_json,
        updated_at = excluded.updated_at`,
    )
    .bind(
      randomId("logo"),
      domain,
      logoUrl,
      JSON.stringify({
        mode: "domain-image",
        provider: "logo.dev",
      }),
      now,
      now,
    )
    .run();

  return {
    domain,
    status: "resolved",
    source: "logo.dev",
    logoUrl,
    cached: null,
    provider: logoDevDomainProvider(env),
  };
}

export async function searchLogoCandidates(
  env: Env,
  query: string,
  strategy: "suggest" | "match" = "suggest",
): Promise<LogoSearchResponse> {
  const secretKey = getSecret(env, "LOGO_DEV_SECRET_KEY") ?? getSecret(env, "LOGO_PROVIDER_API_KEY");
  if (!secretKey) {
    return {
      status: "provider-unconfigured",
      provider: logoDevSearchProvider(env),
      results: [],
    };
  }

  const url = new URL(`${LOGO_DEV_API_BASE_URL}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("strategy", strategy);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${secretKey}`,
    },
  });

  if (!response.ok) {
    return {
      status: "ok",
      provider: logoDevSearchProvider(env),
      results: [],
    };
  }

  const results = (await response.json()) as LogoDevSearchResult[];
  return {
    status: "ok",
    provider: logoDevSearchProvider(env),
    results: results.slice(0, 10).map((result) => ({
      name: result.name,
      domain: result.domain,
      logoUrl: result.logo_url,
    })),
  };
}

function logoDevDomainProvider(env: Env): LogoResolveResult["provider"] {
  return {
    name: "logo.dev",
    mode: "domain-image",
    publishableKeyConfigured: Boolean(getSecret(env, "LOGO_DEV_PUBLISHABLE_KEY")),
  };
}

function logoDevSearchProvider(env: Env): LogoSearchResponse["provider"] {
  return {
    name: "logo.dev",
    mode: "brand-search",
    secretKeyConfigured: Boolean(getSecret(env, "LOGO_DEV_SECRET_KEY") ?? getSecret(env, "LOGO_PROVIDER_API_KEY")),
  };
}
