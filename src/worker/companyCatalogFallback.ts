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
  metadata_json: string | null;
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
  row("9023", "東京地下鉄株式会社", "とうきょうちかてつ", "tokyometro.jp", "陸運・鉄道", "プライム", "9023", ["東京メトロ", "tokyo metro"]),
  row("9020", "東日本旅客鉄道", "ひがしにほんりょかくてつどう", "jreast.co.jp", "陸運・鉄道", "プライム", "9020", ["JR東日本", "jr east"]),
  row("9022", "東海旅客鉄道", "とうかいりょかくてつどう", "jr-central.co.jp", "陸運・鉄道", "プライム", "9022", ["JR東海", "jr central"]),
  row("9021", "西日本旅客鉄道", "にしにほんりょかくてつどう", "westjr.co.jp", "陸運・鉄道", "プライム", "9021", ["JR西日本", "jr west"]),
  row("9005", "東急", "とうきゅう", "tokyu.co.jp", "陸運・鉄道", "プライム", "9005", ["東急電鉄"]),
  row("9007", "小田急電鉄", "おだきゅうでんてつ", "odakyu.jp", "陸運・鉄道", "プライム", "9007", ["小田急"]),
  row("9008", "京王電鉄", "けいおうでんてつ", "keio.co.jp", "陸運・鉄道", "プライム", "9008", ["京王"]),
  row("9009", "京成電鉄", "けいせいでんてつ", "keisei.co.jp", "陸運・鉄道", "プライム", "9009", ["京成"]),
  row("9042", "阪急阪神ホールディングス", "はんきゅうはんしんほーるでぃんぐす", "hankyu-hanshin.co.jp", "陸運・鉄道", "プライム", "9042", ["阪急", "阪神"]),
  row("9044", "南海電気鉄道", "なんかいでんきてつどう", "nankai.co.jp", "陸運・鉄道", "プライム", "9044", ["南海"]),
  row("9147", "NIPPON EXPRESSホールディングス", "にっぽんえくすぷれすほーるでぃんぐす", "nipponexpress-holdings.com", "物流", "プライム", "9147", ["日本通運", "日通"]),
  row("9101", "日本郵船", "にっぽんゆうせん", "nyk.com", "海運", "プライム", "9101", ["NYK"]),
  row("9104", "商船三井", "しょうせんみつい", "mol.co.jp", "海運", "プライム", "9104", ["MOL"]),
  row("9107", "川崎汽船", "かわさききせん", "kline.co.jp", "海運", "プライム", "9107", ["KLINE", "K Line"]),
  row("8002", "丸紅", "まるべに", "marubeni.com", "総合商社", "プライム", "8002"),
  row("8015", "豊田通商", "とよたつうしょう", "toyota-tsusho.com", "総合商社", "プライム", "8015"),
  row("8053", "住友商事", "すみともしょうじ", "sumitomocorp.com", "総合商社", "プライム", "8053"),
  row("4502", "武田薬品工業", "たけだやくひんこうぎょう", "takeda.com", "医薬品", "プライム", "4502", ["武田薬品"]),
  row("4519", "中外製薬", "ちゅうがいせいやく", "chugai-pharm.co.jp", "医薬品", "プライム", "4519"),
  row("4568", "第一三共", "だいいちさんきょう", "daiichisankyo.co.jp", "医薬品", "プライム", "4568"),
  row("4901", "富士フイルムホールディングス", "ふじふいるむほーるでぃんぐす", "fujifilm.com", "化学・精密", "プライム", "4901", ["富士フイルム"]),
  row("6981", "村田製作所", "むらたせいさくしょ", "murata.com", "電子部品", "プライム", "6981", ["村田"]),
  row("6594", "ニデック", "にでっく", "nidec.com", "電気機器", "プライム", "6594", ["日本電産"]),
  row("6954", "ファナック", "ふぁなっく", "fanuc.co.jp", "機械", "プライム", "6954"),
  row("6273", "SMC", "えすえむしー", "smcworld.com", "機械", "プライム", "6273"),
  row("6367", "ダイキン工業", "だいきんこうぎょう", "daikin.co.jp", "機械", "プライム", "6367", ["ダイキン"]),
  row("1605", "INPEX", "いんぺっくす", "inpex.co.jp", "資源・エネルギー", "プライム", "1605"),
  row("5020", "ENEOSホールディングス", "えねおすほーるでぃんぐす", "eneos.co.jp", "資源・エネルギー", "プライム", "5020", ["ENEOS"]),
  row("9501", "東京電力ホールディングス", "とうきょうでんりょくほーるでぃんぐす", "tepco.co.jp", "電力・ガス", "プライム", "9501", ["東京電力", "東電"]),
  row("9502", "中部電力", "ちゅうぶでんりょく", "chuden.co.jp", "電力・ガス", "プライム", "9502"),
  row("9503", "関西電力", "かんさいでんりょく", "kepco.co.jp", "電力・ガス", "プライム", "9503"),
  row("9531", "東京ガス", "とうきょうがす", "tokyo-gas.co.jp", "電力・ガス", "プライム", "9531"),
  row("9532", "大阪ガス", "おおさかがす", "osakagas.co.jp", "電力・ガス", "プライム", "9532"),
  row("4452", "花王", "かおう", "kao.com", "化学・消費財", "プライム", "4452"),
  row("4911", "資生堂", "しせいどう", "corp.shiseido.com", "化粧品・消費財", "プライム", "4911"),
  row("2802", "味の素", "あじのもと", "ajinomoto.co.jp", "食品", "プライム", "2802"),
  row("2502", "アサヒグループホールディングス", "あさひぐるーぷほーるでぃんぐす", "asahigroup-holdings.com", "食品・飲料", "プライム", "2502", ["アサヒ"]),
  row("2503", "キリンホールディングス", "きりんほーるでぃんぐす", "kirinholdings.com", "食品・飲料", "プライム", "2503", ["キリン"]),
  row("2587", "サントリー食品インターナショナル", "さんとりーしょくひんいんたーなしょなる", "suntory.co.jp", "食品・飲料", "プライム", "2587", ["サントリー"]),
  row("1925", "大和ハウス工業", "だいわはうすこうぎょう", "daiwahouse.co.jp", "建設・不動産", "プライム", "1925", ["大和ハウス"]),
  row("1928", "積水ハウス", "せきすいはうす", "sekisuihouse.co.jp", "建設・不動産", "プライム", "1928"),
  row("8801", "三井不動産", "みついふどうさん", "mitsuifudosan.co.jp", "不動産", "プライム", "8801"),
  row("8802", "三菱地所", "みつびしじしょ", "mec.co.jp", "不動産", "プライム", "8802"),
  row("8830", "住友不動産", "すみともふどうさん", "sumitomo-rd.co.jp", "不動産", "プライム", "8830"),
  row("9735", "セコム", "せこむ", "secom.co.jp", "セキュリティ", "プライム", "9735"),
  row("9602", "東宝", "とうほう", "toho.co.jp", "映画・エンタメ", "プライム", "9602"),
  row("7832", "バンダイナムコホールディングス", "ばんだいなむこほーるでぃんぐす", "bandainamco.co.jp", "ゲーム・エンタメ", "プライム", "7832", ["バンダイナムコ"]),
  row("9766", "コナミグループ", "こなみぐるーぷ", "konami.com", "ゲーム・エンタメ", "プライム", "9766", ["コナミ"]),
  row("9684", "スクウェア・エニックス・ホールディングス", "すくうぇあえにっくすほーるでぃんぐす", "hd.square-enix.com", "ゲーム・エンタメ", "プライム", "9684", ["スクエニ", "スクウェアエニックス"]),
  row("google-japan", "グーグル合同会社", "ぐーぐるごうどうがいしゃ", "google.co.jp", "IT・情報通信", "非上場", null),
  row("amazon-japan", "アマゾンジャパン合同会社", "あまぞんじゃぱんごうどうがいしゃ", "amazon.co.jp", "インターネットサービス", "非上場", null),
  row("apple-japan", "Apple Japan合同会社", "あっぷるじゃぱんごうどうがいしゃ", "apple.com", "電気機器・IT", "非上場", null),
  row("microsoft-japan", "日本マイクロソフト株式会社", "にほんまいくろそふと", "microsoft.com", "IT・情報通信", "非上場", null, ["Microsoft Japan", "マイクロソフト"]),
  row("salesforce-japan", "株式会社セールスフォース・ジャパン", "せーるすふぉーすじゃぱん", "salesforce.com", "IT・情報通信", "非上場", null, ["Salesforce"]),
  row("accenture-japan", "アクセンチュア株式会社", "あくせんちゅあ", "accenture.com", "コンサルティング", "非上場", null, ["Accenture"]),
  row("deloitte-tohmatsu", "デロイト トーマツ コンサルティング合同会社", "でろいととーまつこんさるてぃんぐ", "tohmatsu.co.jp", "コンサルティング", "非上場", null, ["デロイト", "DTC"]),
  row("pwc-japan", "PwC Japan合同会社", "ぴーだぶりゅーしーじゃぱん", "pwc.com", "コンサルティング", "非上場", null, ["PwC"]),
  row("ey-japan", "EY Japan株式会社", "いーわいじゃぱん", "ey.com", "コンサルティング", "非上場", null, ["EY"]),
  row("kpmg-japan", "KPMGジャパン", "けーぴーえむじーじゃぱん", "home.kpmg", "コンサルティング", "非上場", null, ["KPMG"]),
  row("mckinsey-japan", "マッキンゼー・アンド・カンパニー日本支社", "まっきんぜーあんどかんぱにー", "mckinsey.com", "コンサルティング", "非上場", null, ["マッキンゼー"]),
  row("bcg-japan", "ボストン コンサルティング グループ", "ぼすとんこんさるてぃんぐぐるーぷ", "bcg.com", "コンサルティング", "非上場", null, ["BCG"]),
  row("bain-japan", "ベイン・アンド・カンパニー", "べいんあんどかんぱにー", "bain.com", "コンサルティング", "非上場", null, ["ベイン"]),
  row("mext", "文部科学省", "もんぶかがくしょう", "mext.go.jp", "官公庁", "対象外", null),
  row("meti", "経済産業省", "けいざいさんぎょうしょう", "meti.go.jp", "官公庁", "対象外", null),
  row("digital-agency", "デジタル庁", "でじたるちょう", "digital.go.jp", "官公庁", "対象外", null),
  row("cao", "内閣府", "ないかくふ", "cao.go.jp", "官公庁", "対象外", null),
  row("soumu", "総務省", "そうむしょう", "soumu.go.jp", "官公庁", "対象外", null),
  row("mof", "財務省", "ざいむしょう", "mof.go.jp", "官公庁", "対象外", null),
  row("mhlw", "厚生労働省", "こうせいろうどうしょう", "mhlw.go.jp", "官公庁", "対象外", null),
  row("mlit", "国土交通省", "こくどこうつうしょう", "mlit.go.jp", "官公庁", "対象外", null),
  row("moe", "環境省", "かんきょうしょう", "env.go.jp", "官公庁", "対象外", null),
  row("tokyo-metropolitan", "東京都庁", "とうきょうとちょう", "metro.tokyo.lg.jp", "地方自治体", "対象外", null),
  row("yokohama-city", "横浜市役所", "よこはましやくしょ", "city.yokohama.lg.jp", "地方自治体", "対象外", null),
  row("osaka-pref", "大阪府庁", "おおさかふちょう", "pref.osaka.lg.jp", "地方自治体", "対象外", null),
  row("osaka-city", "大阪市役所", "おおさかしやくしょ", "city.osaka.lg.jp", "地方自治体", "対象外", null),
  row("kyoto-city", "京都市役所", "きょうとしやくしょ", "city.kyoto.lg.jp", "地方自治体", "対象外", null),
  row("nagoya-city", "名古屋市役所", "なごやしやくしょ", "city.nagoya.jp", "地方自治体", "対象外", null),
  row("fukuoka-city", "福岡市役所", "ふくおかしやくしょ", "city.fukuoka.lg.jp", "地方自治体", "対象外", null),
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

export const fallbackCompanyCatalogCount = fallbackCompanies.length;

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
  aliases: string[] = [],
): CatalogFallbackCompany {
  return {
    id: `fallback:${id}`,
    source: "built-in",
    source_id: ticker ?? id,
    country: "JP",
    name,
    name_kana: nameKana,
    normalized_name: normalizeCatalogSearchText([name, nameKana, domain, ticker, ...aliases].filter(Boolean).join(" ")),
    domain,
    industry,
    market,
    ticker,
    exchange: ticker ? "TSE" : null,
    logo_url: null,
    metadata_json: JSON.stringify({ aliases, importedFrom: "built-in", legalType: inferLegalType(name) }),
    updated_at: fallbackUpdatedAt,
  };
}

function inferLegalType(name: string): string {
  if (name.includes("合同会社")) {
    return "合同会社";
  }
  if (name.includes("国立研究開発法人")) {
    return "国立研究開発法人";
  }
  if (name.includes("独立行政法人")) {
    return "独立行政法人";
  }
  if (name.includes("国立大学法人")) {
    return "国立大学法人";
  }
  if (name.includes("学校法人")) {
    return "学校法人";
  }
  if (name.includes("省")) {
    return "省庁";
  }
  if (name.includes("市役所") || name.includes("府庁") || name.includes("都庁")) {
    return "地方自治体";
  }
  return "株式会社";
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
