import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptPath = resolve(__dirname, "../../scripts/company-catalog-csv-to-sql.mjs");

describe("company catalog CSV import script", () => {
  it("includes aliases and legal type metadata in generic CSV output", async () => {
    const dir = await mkdtemp(join(tmpdir(), "catalog-generic-"));
    const input = join(dir, "manual.csv");
    const output = join(dir, "catalog.sql");
    await writeFile(
      input,
      [
        "証券コード,会社名,読み,業種,市場区分,取引所,ホームページ,別名,法人種別",
        "9023,東京地下鉄株式会社,とうきょうちかてつ,陸運・鉄道,プライム,TSE,tokyometro.jp,東京メトロ;tokyo metro,株式会社",
        "",
      ].join("\n"),
      "utf8",
    );

    await execFileAsync(process.execPath, [scriptPath, "--input", input, "--out", output]);

    const sql = await readFile(output, "utf8");
    expect(sql).toContain("東京地下鉄株式会社");
    expect(sql).toContain("東京メトロ tokyo metro");
    expect(sql).toContain('"legalType":"株式会社"');
  });

  it("imports headerless NTA-style rows into chunked SQL files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "catalog-nta-"));
    const input = join(dir, "nta.csv");
    const outDir = join(dir, "sql");
    const row = [
      "1",
      "1234567890123",
      "01",
      "0",
      "2026-05-29",
      "",
      "サンプル合同会社",
      "",
      "305",
      "東京都",
      "千代田区",
      "丸の内一丁目",
      "",
      "13",
      "101",
      "1000005",
      "",
      "",
      "",
      "",
      "",
      "",
      "2026-05-29",
      "1",
      "Sample LLC",
      "Tokyo",
      "Chiyoda",
      "",
      "サンプルゴウドウガイシャ",
      "0",
    ];
    await writeFile(input, `${row.join(",")}\n`, "utf8");

    await execFileAsync(process.execPath, [
      scriptPath,
      "--preset",
      "nta",
      "--input",
      input,
      "--out-dir",
      outDir,
      "--chunk-rows",
      "1",
      "--active-only",
    ]);

    const files = await readdir(outDir);
    expect(files).toEqual(["company_catalog_0001.sql"]);
    const sql = await readFile(join(outDir, files[0]), "utf8");
    expect(sql).toContain("サンプル合同会社");
    expect(sql).toContain("サンプルゴウドウガイシャ");
    expect(sql).toContain('"legalType":"合同会社"');
    expect(sql).toContain('"prefecture":"東京都"');
  });
});
