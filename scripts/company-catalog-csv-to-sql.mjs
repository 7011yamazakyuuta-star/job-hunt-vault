#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";

const args = parseArgs(process.argv.slice(2));

if (!args.input || args.help) {
  printHelp();
  process.exit(args.help ? 0 : 1);
}

const source = args.source || "jpx";
const country = args.country || "JP";
const defaultExchange = args.exchange || "TSE";
const now = new Date().toISOString();
const raw = await readFile(args.input, "utf8");
const records = parseCsv(raw.replace(/^\uFEFF/, ""));

if (records.length < 2) {
  throw new Error(`No CSV rows found in ${args.input}`);
}

const [headers, ...rows] = records;
const normalizedHeaders = headers.map(normalizeHeader);
const statements = rows
  .map((row) => normalizeCatalogRow(rowToObject(normalizedHeaders, row), { country, defaultExchange, now, source }))
  .filter((row) => row.name)
  .map(toUpsertSql);

const output = [
  `-- Generated from ${basename(args.input)} for company_catalog.`,
  "-- Do not commit official-source raw dumps or production DB exports.",
  "BEGIN TRANSACTION;",
  ...statements,
  "COMMIT;",
  "",
].join("\n");

if (args.out) {
  await writeFile(args.out, output, "utf8");
} else {
  process.stdout.write(output);
}

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
    } else if (value === "--source") {
      parsed.source = argv[++index];
    } else if (value === "--country") {
      parsed.country = argv[++index];
    } else if (value === "--exchange") {
      parsed.exchange = argv[++index];
    }
  }
  return parsed;
}

function printHelp() {
  process.stdout.write(`Usage:
  node scripts/company-catalog-csv-to-sql.mjs --input ./work/jpx.csv --out ./work/company_catalog.sql

Options:
  --input, -i     Source CSV exported from JPX or a manual company list
  --out, -o       Output SQL file; stdout is used when omitted
  --source        Catalog source label, default: jpx
  --country       Country code, default: JP
  --exchange      Default exchange when the CSV has no exchange column, default: TSE
`);
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

function rowToObject(headers, row) {
  return Object.fromEntries(headers.map((header, index) => [header, row[index]?.trim() ?? ""]));
}

function normalizeCatalogRow(row, defaults) {
  const ticker = pick(row, ["ticker", "code", "security_code"]);
  const name = pick(row, ["name", "company_name", "issue_name"]);
  const nameKana = pick(row, ["name_kana", "company_name_kana", "reading"]);
  const domain = normalizeDomain(pick(row, ["domain", "website", "url"]));
  const industry = pick(row, ["industry", "sector_33", "sector_17"]);
  const market = pick(row, ["market", "market_segment", "product_category"]);
  const exchange = pick(row, ["exchange"]) || defaults.defaultExchange;
  const sourceId = pick(row, ["source_id", "id"]) || ticker || name;
  const normalizedName = normalizeSearchText(name);
  const id = stableId(defaults.source, sourceId || normalizedName);

  return {
    country: defaults.country,
    domain,
    exchange,
    id,
    industry,
    logoUrl: pick(row, ["logo_url"]),
    market,
    metadataJson: JSON.stringify({ importedFrom: defaults.source }),
    name,
    nameKana,
    normalizedName,
    now: defaults.now,
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
    ["銘柄名", "issue_name"],
    ["会社名", "company_name"],
    ["商号", "company_name"],
    ["銘柄名（カナ）", "name_kana"],
    ["銘柄名(カナ)", "name_kana"],
    ["会社名カナ", "company_name_kana"],
    ["読み", "reading"],
    ["市場・商品区分", "product_category"],
    ["市場区分", "market_segment"],
    ["市場", "market"],
    ["33業種区分", "sector_33"],
    ["17業種区分", "sector_17"],
    ["業種", "industry"],
    ["取引所", "exchange"],
    ["ホームページ", "website"],
    ["会社ホームページ", "website"],
  ]);
  return aliases.get(header.trim()) ?? compact;
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

function stableId(source, value) {
  return `${source}_${normalizeSearchText(value).replace(/[^a-z0-9一-龠ぁ-んァ-ヶー]+/gi, "_").replace(/^_+|_+$/g, "")}`;
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
