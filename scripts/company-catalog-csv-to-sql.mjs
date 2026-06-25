#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";

const ntaHeaders = [
  "sequence_number",
  "corporate_number",
  "process",
  "correct",
  "update_date",
  "change_date",
  "corporate_name",
  "name_image_id",
  "kind",
  "prefecture_name",
  "city_name",
  "street_number",
  "address_image_id",
  "prefecture_code",
  "city_code",
  "post_code",
  "address_outside",
  "address_outside_image_id",
  "close_date",
  "close_cause",
  "successor_corporate_number",
  "change_cause",
  "assignment_date",
  "latest",
  "en_name",
  "en_prefecture_name",
  "en_city_name",
  "en_address_outside",
  "furigana",
  "hihyoji",
];

const args = parseArgs(process.argv.slice(2));

if (!args.input || args.help) {
  printHelp();
  process.exit(args.help ? 0 : 1);
}

const preset = args.preset || (args.source === "nta" ? "nta" : "generic");
const source = args.source || (preset === "nta" ? "nta" : "jpx");
const country = args.country || "JP";
const defaultExchange = args.exchange || (preset === "nta" ? "" : "TSE");
const encoding = args.encoding || "utf8";
const chunkRows = Math.max(1, Number(args.chunkRows || (args.outDir ? 5000 : 1000000000)));
const limit = args.limit ? Math.max(1, Number(args.limit)) : null;
const now = new Date().toISOString();
const rawBuffer = await readFile(args.input);
const raw = decodeInput(rawBuffer, encoding);
const records = parseCsv(raw.replace(/^\uFEFF/, ""));
const includeKinds = parseSet(args.includeKind);
const prefectures = parseSet(args.prefecture);

if (!records.length) {
  throw new Error(`No CSV rows found in ${args.input}`);
}

const { headers, rows } = splitHeaders(records, preset);
const normalizedHeaders = headers.map(normalizeHeader);
const catalogRows = [];
const skipped = { inactive: 0, kind: 0, name: 0, prefecture: 0 };

for (const row of rows) {
  if (limit && catalogRows.length >= limit) {
    break;
  }
  const catalogRow = normalizeCatalogRow(rowToObject(normalizedHeaders, row), {
    activeOnly: Boolean(args.activeOnly),
    country,
    defaultExchange,
    now,
    preset,
    source,
  });
  if (!catalogRow.name) {
    skipped.name += 1;
    continue;
  }
  if (catalogRow.skipReason === "inactive") {
    skipped.inactive += 1;
    continue;
  }
  if (includeKinds.size && !includeKinds.has(catalogRow.kind) && !includeKinds.has(catalogRow.legalType)) {
    skipped.kind += 1;
    continue;
  }
  if (prefectures.size && catalogRow.prefecture && !prefectures.has(catalogRow.prefecture)) {
    skipped.prefecture += 1;
    continue;
  }
  catalogRows.push(catalogRow);
}

if (args.outDir) {
  await writeChunkedSql(args.outDir, catalogRows, chunkRows);
} else {
  const output = buildSqlFile(catalogRows, { fileName: basename(args.input), part: null });
  if (args.out) {
    await writeFile(args.out, output, "utf8");
  } else {
    process.stdout.write(output);
  }
}

const skippedTotal = Object.values(skipped).reduce((sum, value) => sum + value, 0);
console.error(
  [
    `catalog rows: ${catalogRows.length}`,
    `source: ${source}`,
    `preset: ${preset}`,
    `input rows: ${rows.length}`,
    skippedTotal ? `skipped: ${JSON.stringify(skipped)}` : null,
  ]
    .filter(Boolean)
    .join(" / "),
);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--help" || value === "-h") {
      parsed.help = true;
    } else if (value === "--input" || value === "-i") {
      parsed.input = argv[++index];
    } else if (value === "--out" || value === "-o") {
      parsed.out = argv[++index];
    } else if (value === "--out-dir") {
      parsed.outDir = argv[++index];
    } else if (value === "--chunk-rows") {
      parsed.chunkRows = argv[++index];
    } else if (value === "--source") {
      parsed.source = argv[++index];
    } else if (value === "--preset") {
      parsed.preset = argv[++index];
    } else if (value === "--country") {
      parsed.country = argv[++index];
    } else if (value === "--exchange") {
      parsed.exchange = argv[++index];
    } else if (value === "--encoding") {
      parsed.encoding = argv[++index];
    } else if (value === "--limit") {
      parsed.limit = argv[++index];
    } else if (value === "--active-only") {
      parsed.activeOnly = true;
    } else if (value === "--include-kind") {
      parsed.includeKind = appendCsvArg(parsed.includeKind, argv[++index]);
    } else if (value === "--prefecture") {
      parsed.prefecture = appendCsvArg(parsed.prefecture, argv[++index]);
    }
  }
  return parsed;
}

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/company-catalog-csv-to-sql.mjs --input ./work/jpx.csv --out ./work/company_catalog.sql
  node scripts/company-catalog-csv-to-sql.mjs --preset nta --input ./work/13_tokyo.csv --out-dir ./work/catalog-sql --chunk-rows 5000 --active-only

Options:
  --input, -i       Source CSV exported from JPX, NTA, or a manual company list
  --out, -o         Output one SQL file; stdout is used when omitted
  --out-dir         Output chunked SQL files, better for tens of thousands of rows
  --chunk-rows      Rows per SQL file when --out-dir is used, default: 5000
  --source          Catalog source label, default: jpx or nta from preset
  --preset          generic, jpx, or nta. The nta preset accepts headerless NTA CSV rows
  --country         Country code, default: JP
  --exchange        Default exchange when the CSV has no exchange column, default: TSE
  --encoding        utf8 or utf16le. Use Unicode CSV from NTA; Shift-JIS is intentionally unsupported here
  --limit           Import at most this many rows
  --active-only     For NTA data, skip closed or non-latest rows when the columns are present
  --include-kind    Comma-separated NTA kind codes or legal type labels to keep
  --prefecture      Comma-separated prefecture names to keep

Accepted optional columns include aliases, alias, short_name, common_name, 別名, 略称, and 通称.
NTA-style columns such as 法人番号, 商号又は名称, フリガナ, and 法人種別 are also accepted.
Separate multiple aliases with semicolons, Japanese commas, or vertical bars.
`);
}

function decodeInput(buffer, encodingName) {
  if (encodingName === "utf16le") {
    return buffer.toString("utf16le");
  }
  if (encodingName === "utf8") {
    return buffer.toString("utf8");
  }
  throw new Error(`Unsupported encoding: ${encodingName}. Use utf8 or utf16le.`);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);
  return rows.filter((csvRow) => csvRow.some((value) => value.trim()));
}

function splitHeaders(records, presetName) {
  if (presetName === "nta" && !looksLikeHeader(records[0])) {
    return { headers: ntaHeaders, rows: records };
  }
  const [headers, ...rows] = records;
  return { headers, rows };
}

function looksLikeHeader(row) {
  const joined = row.join(",");
  return /法人番号|商号|会社名|銘柄|name|corporate/i.test(joined);
}

function rowToObject(headers, row) {
  return Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? ""]));
}

function normalizeCatalogRow(row, defaults) {
  const ticker = pick(row, ["ticker", "code", "security_code"]);
  const name = pick(row, ["name", "company_name", "issue_name", "corporate_name"]);
  const nameKana = pick(row, ["name_kana", "company_name_kana", "reading", "furigana"]);
  const domain = normalizeDomain(pick(row, ["domain", "website", "url"]));
  const industry = pick(row, ["industry", "sector_33", "sector_17"]);
  const kind = pick(row, ["legal_type", "organization_type", "corporate_type", "kind"]);
  const legalType = normalizeLegalType(kind, name);
  const market = pick(row, ["market", "market_segment", "product_category"]) || defaultMarketForLegalType(legalType, defaults.preset);
  const exchange = pick(row, ["exchange"]) || (ticker ? defaults.defaultExchange : "");
  const corporateNumber = pick(row, ["corporate_number"]);
  const sourceId = pick(row, ["source_id", "id"]) || corporateNumber || ticker || name;
  const aliases = splitAliases(pick(row, ["aliases", "alias", "short_name", "common_name"]));
  const prefecture = pick(row, ["prefecture", "prefecture_name"]);
  const city = pick(row, ["city", "city_name"]);
  const postCode = pick(row, ["post_code", "postcode", "zip"]);
  const enName = pick(row, ["en_name", "english_name"]);
  const latest = pick(row, ["latest"]);
  const closeDate = pick(row, ["close_date"]);
  const skipReason = defaults.activeOnly && ((latest && latest !== "1") || closeDate) ? "inactive" : null;
  const normalizedName = normalizeSearchText(
    [name, nameKana, domain, ticker, corporateNumber, enName, prefecture, city, ...aliases].filter(Boolean).join(" "),
  );
  const id = stableId(defaults.source, sourceId || normalizedName);
  const metadata = {
    ...(aliases.length ? { aliases } : {}),
    ...(city ? { city } : {}),
    ...(corporateNumber ? { corporateNumber } : {}),
    ...(enName ? { enName } : {}),
    importedFrom: defaults.source,
    ...(kind ? { kind } : {}),
    ...(legalType ? { legalType } : {}),
    ...(postCode ? { postCode } : {}),
    ...(prefecture ? { prefecture } : {}),
  };

  return {
    country: defaults.country,
    domain,
    exchange,
    id,
    industry,
    kind: kind || legalType,
    legalType,
    logoUrl: pick(row, ["logo_url"]),
    market,
    metadataJson: JSON.stringify(metadata),
    name,
    nameKana,
    normalizedName,
    now: defaults.now,
    prefecture,
    skipReason,
    source: defaults.source,
    sourceId,
    ticker,
  };
}

function pick(row, keys) {
  for (const key of keys) {
    const value = row[key];
    if (value) {
      return value;
    }
  }
  return "";
}

function normalizeHeader(header) {
  const compact = header.trim().toLowerCase().replace(/\s+/g, "_");
  const aliases = new Map([
    ["コード", "security_code"],
    ["証券コード", "security_code"],
    ["銘柄コード", "security_code"],
    ["法人番号", "corporate_number"],
    ["一連番号", "sequence_number"],
    ["処理区分", "process"],
    ["訂正区分", "correct"],
    ["更新年月日", "update_date"],
    ["変更年月日", "change_date"],
    ["銘柄名", "issue_name"],
    ["会社名", "company_name"],
    ["商号", "company_name"],
    ["商号又は名称", "company_name"],
    ["名称", "company_name"],
    ["銘柄名（カナ）", "name_kana"],
    ["銘柄名(カナ)", "name_kana"],
    ["会社名カナ", "company_name_kana"],
    ["商号又は名称フリガナ", "name_kana"],
    ["フリガナ", "name_kana"],
    ["読み", "reading"],
    ["読み仮名", "reading"],
    ["市場・商品区分", "product_category"],
    ["市場区分", "market_segment"],
    ["市場", "market"],
    ["33業種区分", "sector_33"],
    ["17業種区分", "sector_17"],
    ["業種", "industry"],
    ["取引所", "exchange"],
    ["ホームページ", "website"],
    ["会社ホームページ", "website"],
    ["別名", "aliases"],
    ["略称", "aliases"],
    ["通称", "aliases"],
    ["ブランド名", "aliases"],
    ["法人種別", "legal_type"],
    ["組織区分", "organization_type"],
    ["種別", "kind"],
    ["都道府県名", "prefecture_name"],
    ["市区町村名", "city_name"],
    ["郵便番号", "post_code"],
    ["登記記録の閉鎖等年月日", "close_date"],
    ["最新履歴", "latest"],
    ["英語表記", "en_name"],
    ["国外所在地", "address_outside"],
  ]);
  return aliases.get(header.trim()) ?? compact;
}

function splitAliases(value) {
  if (!value) {
    return [];
  }
  return Array.from(
    new Set(
      value
        .split(/[;；、|｜]/)
        .map((alias) => alias.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeLegalType(value, name) {
  if (!value) {
    return inferLegalTypeFromName(name);
  }
  const kindMap = new Map([
    ["101", "国の機関"],
    ["201", "地方公共団体"],
    ["301", "株式会社"],
    ["302", "有限会社"],
    ["303", "合名会社"],
    ["304", "合資会社"],
    ["305", "合同会社"],
    ["399", "その他の設立登記法人"],
    ["401", "外国会社等"],
    ["499", "その他"],
  ]);
  return kindMap.get(value) ?? value;
}

function inferLegalTypeFromName(name) {
  if (!name) {
    return "";
  }
  const rules = [
    ["株式会社", "株式会社"],
    ["有限会社", "有限会社"],
    ["合同会社", "合同会社"],
    ["合名会社", "合名会社"],
    ["合資会社", "合資会社"],
    ["国立研究開発法人", "国立研究開発法人"],
    ["独立行政法人", "独立行政法人"],
    ["国立大学法人", "国立大学法人"],
    ["学校法人", "学校法人"],
    ["医療法人", "医療法人"],
    ["社会福祉法人", "社会福祉法人"],
    ["一般社団法人", "一般社団法人"],
    ["一般財団法人", "一般財団法人"],
    ["公益社団法人", "公益社団法人"],
    ["公益財団法人", "公益財団法人"],
  ];
  return rules.find(([needle]) => name.includes(needle))?.[1] ?? "";
}

function defaultMarketForLegalType(legalType, presetName) {
  if (presetName !== "nta") {
    return "";
  }
  if (legalType === "国の機関" || legalType === "地方公共団体") {
    return "対象外";
  }
  return "非上場";
}

function normalizeSearchText(value) {
  return value.trim().toLowerCase().normalize("NFKC");
}

function normalizeDomain(value) {
  if (!value) {
    return "";
  }
  try {
    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
    return new URL(withProtocol).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

function stableId(sourceName, value) {
  return `${sourceName}_${normalizeSearchText(value).replace(/[^a-z0-9一-龠ぁ-んァ-ヶー]+/gi, "_").replace(/^_+|_+$/g, "")}`;
}

async function writeChunkedSql(outDir, rows, chunkSize) {
  await mkdir(outDir, { recursive: true });
  const chunks = [];
  for (let index = 0; index < rows.length; index += chunkSize) {
    chunks.push(rows.slice(index, index + chunkSize));
  }
  for (let index = 0; index < chunks.length; index += 1) {
    const part = `${String(index + 1).padStart(4, "0")}`;
    const output = buildSqlFile(chunks[index], { fileName: basename(args.input), part });
    await writeFile(join(outDir, `company_catalog_${part}.sql`), output, "utf8");
  }
}

function buildSqlFile(rows, { fileName, part }) {
  const label = part ? `${fileName}, part ${part}` : fileName;
  return [
    `-- Generated from ${label} for company_catalog.`,
    "-- Do not commit official-source raw dumps or production DB exports.",
    ...rows.map(toUpsertSql),
    "",
  ].join("\n");
}

function toUpsertSql(row) {
  return `INSERT INTO company_catalog
  (id, source, source_id, country, name, name_kana, normalized_name, domain, industry, market, ticker, exchange, logo_url, metadata_json, created_at, updated_at)
VALUES
  (${sql(row.id)}, ${sql(row.source)}, ${sql(row.sourceId)}, ${sql(row.country)}, ${sql(row.name)}, ${sql(row.nameKana)}, ${sql(row.normalizedName)}, ${sql(row.domain)}, ${sql(row.industry)}, ${sql(row.market)}, ${sql(row.ticker)}, ${sql(row.exchange)}, ${sql(row.logoUrl)}, ${sql(row.metadataJson)}, ${sql(row.now)}, ${sql(row.now)})
ON CONFLICT(id) DO UPDATE SET
  source_id = excluded.source_id,
  country = excluded.country,
  name = excluded.name,
  name_kana = excluded.name_kana,
  normalized_name = excluded.normalized_name,
  domain = excluded.domain,
  industry = excluded.industry,
  market = excluded.market,
  ticker = excluded.ticker,
  exchange = excluded.exchange,
  logo_url = excluded.logo_url,
  metadata_json = excluded.metadata_json,
  updated_at = excluded.updated_at;`;
}

function sql(value) {
  if (!value) {
    return "NULL";
  }
  return `'${String(value).replace(/'/g, "''")}'`;
}

function appendCsvArg(current, value) {
  return [current, value].filter(Boolean).join(",");
}

function parseSet(value) {
  if (!value) {
    return new Set();
  }
  return new Set(value.split(",").map((item) => item.trim()).filter(Boolean));
}
