export type CatalogFallbackCompany = {
  id: string;
  source: string;
  source_id: string | null;
  country: string;
  name: string;
  name_kana: string | null;
  normalized_name: string;
  domain: string | null;
  industry: string | null;
  market: string | null;
  ticker: string | null;
  exchange: string | null;
  logo_url: string | null;
  updated_at: string;
};

const fallbackUpdatedAt = "2026-06-24T00:00:00.000Z";

const fallbackCompanies = [
  row("7011", "三菱重工業", "みつびしじゅうこうぎょう", "mhi.com", "機械", "プライム", "7011"),
  row("7203", "トヨタ自動車", "とよたじどうしゃ", "global.toyota", "輸送用機器", "プライム", "7203"),
  row("6758", "ソニーグループ", "そにーぐるーぷ", "sony.com", "電気機器・エンタメ", "プライム", "6758"),
  row("6098", "リクルートホールディングス", "りくるーとほーるでぃんぐす", "recruit-holdings.com", "サービス", "プライム", "6098"),
  row("7974", "任天堂", "にんてんどう", "nintendo.com", "ゲーム・エンタメ", "プライム", "7974"),
  row("6861", "キーエンス", "きーえんす", "keyence.co.jp", "電気機器", "プライム", "6861"),
  row("9984", "ソフトバンクグループ", "そふとばんくぐるーぷ", "group.softbank", "情報・通信", "プライム", "9984"),
  row("9432", "日本電信電話", "にっぽんでんしんでんわ", "group.ntt", "情報・通信", "プライム", "9432"),
  row("9433", "KDDI", "けいでぃーでぃーあい", "kddi.com", "情報・通信", "プライム", "9433"),
  row("9983", "ファーストリテイリング", "ふぁーすとりていりんぐ", "fastretailing.com", "小売", "プライム", "9983"),
  row("8035", "東京エレクトロン", "とうきょうえれくとろん", "tel.co.jp", "電気機器", "プライム", "8035"),
  row("6501", "日立製作所", "ひたちせいさくしょ", "hitachi.com", "電気機器", "プライム", "6501"),
  row("6701", "NEC", "えぬいーしー", "nec.com", "電気機器・IT", "プライム", "6701"),
  row("6702", "富士通", "ふじつう", "fujitsu.com", "IT・情報通信", "プライム", "6702"),
  row("6752", "パナソニックホールディングス", "ぱなそにっくほーるでぃんぐす", "holdings.panasonic", "電気機器", "プライム", "6752"),
  row("7267", "本田技研工業", "ほんだぎけんこうぎょう", "global.honda", "輸送用機器", "プライム", "7267"),
  row("8058", "三菱商事", "みつびししょうじ", "mitsubishicorp.com", "総合商社", "プライム", "8058"),
  row("8001", "伊藤忠商事", "いとうちゅうしょうじ", "itochu.co.jp", "総合商社", "プライム", "8001"),
  row("8031", "三井物産", "みついぶっさん", "mitsui.com", "総合商社", "プライム", "8031"),
  row("8306", "三菱UFJフィナンシャル・グループ", "みつびしゆーえふじぇいふぃなんしゃるぐるーぷ", "mufg.jp", "銀行", "プライム", "8306"),
  row("8316", "三井住友フィナンシャルグループ", "みついすみともふぃなんしゃるぐるーぷ", "smfg.co.jp", "銀行", "プライム", "8316"),
  row("8411", "みずほフィナンシャルグループ", "みずほふぃなんしゃるぐるーぷ", "mizuho-fg.co.jp", "銀行", "プライム", "8411"),
  row("5401", "日本製鉄", "にっぽんせいてつ", "nipponsteel.com", "鉄鋼", "プライム", "5401"),
  row("9201", "日本航空", "にほんこうくう", "jal.com", "空運", "プライム", "9201"),
  row("9202", "ANAホールディングス", "えーえぬえーほーるでぃんぐす", "ana.co.jp", "空運", "プライム", "9202"),
  row("4324", "電通グループ", "でんつうぐるーぷ", "dentsu.com", "広告・マーケティング", "プライム", "4324"),
  row("2433", "博報堂DYホールディングス", "はくほうどうでぃーわいほーるでぃんぐす", "hakuhodody-holdings.co.jp", "広告・マーケティング", "プライム", "2433"),
  row("4751", "サイバーエージェント", "さいばーえーじぇんと", "cyberagent.co.jp", "インターネットサービス", "プライム", "4751"),
  row("4385", "メルカリ", "めるかり", "about.mercari.com", "インターネットサービス", "プライム", "4385"),
  row("4661", "オリエンタルランド", "おりえんたるらんど", "olc.co.jp", "レジャー", "プライム", "4661"),
  row("google-japan", "グーグル合同会社", "ぐーぐるごうどうがいしゃ", "google.co.jp", "IT・情報通信", "非上場", null),
  row("amazon-japan", "アマゾンジャパン合同会社", "あまぞんじゃぱんごうどうがいしゃ", "amazon.co.jp", "インターネットサービス", "非上場", null),
  row("apple-japan", "Apple Japan合同会社", "あっぷるじゃぱんごうどうがいしゃ", "apple.com", "電気機器・IT", "非上場", null),
  row("mext", "文部科学省", "もんぶかがくしょう", "mext.go.jp", "官公庁", "対象外", null),
  row("meti", "経済産業省", "けいざいさんぎょうしょう", "meti.go.jp", "官公庁", "対象外", null),
  row("digital-agency", "デジタル庁", "でじたるちょう", "digital.go.jp", "官公庁", "対象外", null),
  row("tokyo-metropolitan", "東京都庁", "とうきょうとちょう", "metro.tokyo.lg.jp", "地方自治体", "対象外", null),
  row("yokohama-city", "横浜市役所", "よこはましやくしょ", "city.yokohama.lg.jp", "地方自治体", "対象外", null),
  row("riken", "国立研究開発法人理化学研究所", "りかがくけんきゅうしょ", "riken.jp", "国立研究開発法人", "対象外", null),
  row("jaxa", "国立研究開発法人宇宙航空研究開発機構", "うちゅうこうくうけんきゅうかいはつきこう", "jaxa.jp", "国立研究開発法人", "対象外", null),
  row("aist", "国立研究開発法人産業技術総合研究所", "さんぎょうぎじゅつそうごうけんきゅうしょ", "aist.go.jp", "国立研究開発法人", "対象外", null),
  row("jst", "国立研究開発法人科学技術振興機構", "かがくぎじゅつしんこうきこう", "jst.go.jp", "国立研究開発法人", "対象外", null),
  row("ipa", "独立行政法人情報処理推進機構", "じょうほうしょりすいしんきこう", "ipa.go.jp", "独立行政法人", "対象外", null),
  row("jica", "独立行政法人国際協力機構", "こくさいきょうりょくきこう", "jica.go.jp", "独立行政法人", "対象外", null),
  row("utokyo", "国立大学法人東京大学", "とうきょうだいがく", "u-tokyo.ac.jp", "教育・研究", "対象外", null),
  row("keio", "学校法人慶應義塾", "けいおうぎじゅく", "keio.ac.jp", "教育・研究", "対象外", null),
  row("waseda", "学校法人早稲田大学", "わせだだいがく", "waseda.jp", "教育・研究", "対象外", null),
];

export function searchFallbackCompanyCatalog(query: string, industry: string | null, sort: string | null): CatalogFallbackCompany[] {
  const normalizedQuery = normalizeCatalogSearchText(query);
  const filtered = fallbackCompanies.filter((company) => {
    const matchesQuery =
      !normalizedQuery ||
      company.normalized_name.includes(normalizedQuery) ||
      company.name.toLowerCase().includes(normalizedQuery) ||
      (company.name_kana ?? "").includes(normalizedQuery) ||
      (company.ticker ?? "").includes(normalizedQuery) ||
      (company.domain ?? "").includes(normalizedQuery);
    return matchesQuery && (!industry || company.industry === industry);
  });

  return filtered
    .sort((a, b) => {
      if (sort === "industry") {
        return compareNullable(a.industry, b.industry) || compareNullable(a.name_kana, b.name_kana) || a.name.localeCompare(b.name, "ja");
      }
      if (sort === "ticker") {
        return compareNullable(a.ticker, b.ticker) || compareNullable(a.name_kana, b.name_kana) || a.name.localeCompare(b.name, "ja");
      }
      return compareNullable(a.name_kana, b.name_kana) || a.name.localeCompare(b.name, "ja");
    })
    .slice(0, 50);
}

function row(
  id: string,
  name: string,
  nameKana: string,
  domain: string,
  industry: string,
  market: string,
  ticker: string | null,
): CatalogFallbackCompany {
  return {
    id: `fallback:${id}`,
    source: "built-in",
    source_id: ticker ?? id,
    country: "JP",
    name,
    name_kana: nameKana,
    normalized_name: normalizeCatalogSearchText([name, nameKana, domain, ticker].filter(Boolean).join(" ")),
    domain,
    industry,
    market,
    ticker,
    exchange: ticker ? "TSE" : null,
    logo_url: null,
    updated_at: fallbackUpdatedAt,
  };
}

function normalizeCatalogSearchText(input: string): string {
  return input.trim().toLowerCase().normalize("NFKC");
}

function compareNullable(a: string | null, b: string | null): number {
  if (a && b) {
    return a.localeCompare(b, "ja");
  }
  if (a) {
    return -1;
  }
  if (b) {
    return 1;
  }
  return 0;
}
