import { describe, expect, it } from "vitest";
import { fallbackCompanyCatalogCount, searchFallbackCompanyCatalog } from "./companyCatalogFallback";

describe("fallback company catalog", () => {
  it("matches common aliases such as Tokyo Metro", () => {
    const [company] = searchFallbackCompanyCatalog("東京メトロ", null, null);

    expect(company?.name).toBe("東京地下鉄株式会社");
    expect(company?.ticker).toBe("9023");
  });

  it("keeps the documented built-in catalog count in sync", () => {
    expect(fallbackCompanyCatalogCount).toBe(117);
  });
});
