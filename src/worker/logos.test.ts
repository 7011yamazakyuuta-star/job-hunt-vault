import { afterEach, describe, expect, it, vi } from "vitest";
import { buildLogoDevImageUrl, normalizeLogoDomain, searchLogoCandidates } from "./logos";

describe("logo provider helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes domains from raw domains and URLs", () => {
    expect(normalizeLogoDomain("https://www.sony.com/careers")).toBe("sony.com");
    expect(normalizeLogoDomain("recruit.co.jp")).toBe("recruit.co.jp");
    expect(normalizeLogoDomain("not a domain")).toBeNull();
  });

  it("builds Logo.dev image URLs with the publishable key", () => {
    const url = new URL(buildLogoDevImageUrl("sony.com", "pk_test"));
    expect(url.origin).toBe("https://img.logo.dev");
    expect(url.pathname).toBe("/sony.com");
    expect(url.searchParams.get("token")).toBe("pk_test");
    expect(url.searchParams.get("format")).toBe("png");
  });

  it("does not call provider search when secret key is missing", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const response = await searchLogoCandidates({} as Env, "sony");
    expect(response.status).toBe("provider-unconfigured");
    expect(response.results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("searches Logo.dev with a server-side bearer token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify([{ name: "Sony", domain: "sony.com", logo_url: "https://img.logo.dev/sony.com" }]), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      }),
    );

    const response = await searchLogoCandidates({ LOGO_DEV_SECRET_KEY: "sk_test" } as unknown as Env, "sony", "match");

    expect(response.status).toBe("ok");
    expect(response.results).toEqual([{ name: "Sony", domain: "sony.com", logoUrl: "https://img.logo.dev/sony.com" }]);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("strategy=match");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer sk_test");
  });
});
