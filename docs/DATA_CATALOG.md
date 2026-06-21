# 企業台帳とロゴ取得の方針

Job Hunt Vault では、ユーザーが管理する選考データと、外部由来の企業参照データを分けて扱います。

## 1. ユーザーの選考データ

`companies` はルーム内で実際に追跡する企業です。

- 企業名
- 読み
- ドメイン
- 業種
- 直近締切
- 証券コード
- 取引所
- 採用ページURL
- MyPage URL
- ロゴURL
- メモ

ここには「自分が今選考管理している企業」だけを置きます。

## 2. 参照用の企業辞書

`company_catalog` は企業検索や入力補完に使う辞書です。

- source: `jpx`, `manual`, `logo.dev`, `custom` など
- source_id: 公式データ側のID
- country
- name
- name_kana
- normalized_name
- domain
- industry
- market
- ticker
- exchange
- logo_url
- metadata_json

JPX の上場会社一覧、証券コード、市場区分、業種などは、この `company_catalog` に取り込みます。選考データとは別なので、後から辞書を更新してもユーザーの進捗やメモには触りません。ユーザーが企業を台帳に追加するときだけ、企業名、読み、業種、証券コード、取引所、候補ドメインを `companies` 側へコピーします。

## 3. JPXなどを入れる理由

日本企業を大量に扱う場合、毎回企業名・業種・証券コードを手入力すると破綻します。公式データを辞書として取り込むと、次のことができます。

- 企業名の補完
- 50音順に近い並べ替え
- 業種別の絞り込み
- 上場/非上場の区別
- 証券コードや市場区分の表示
- ロゴ取得に使う候補ドメインの整理

ただし、JPXだけでは全企業のWebサイトドメインやロゴまでは揃いません。ロゴは Logo.dev などのprovider、未上場企業や外資企業はユーザー入力・外部provider・手動補完を併用します。

## 4. ロゴ取得

ロゴ画像はリポジトリに同梱しません。

実装方針:

- `GET /api/logo/resolve?domain=example.com`
  - ドメインからLogo.dev画像URLを作り、`logo_cache` に保存します。
- `GET /api/logo/search?q=sony`
  - 企業名からLogo.devの候補を検索します。
  - Word/Officeのオンライン画像検索に近い体験ですが、無断スクレイピングではなくprovider APIを使います。

キーの扱い:

- `LOGO_DEV_PUBLISHABLE_KEY`
  - 画像CDN用のpublishable keyです。
  - Cloudflareの環境変数またはsecretに置きます。
- `LOGO_DEV_SECRET_KEY`
  - 企業名検索用のsecret keyです。
  - 必ずCloudflare Workers Secretsに置きます。

チャットやGitHubに貼らないもの:

- `LOGO_DEV_SECRET_KEY`
- `.env`
- `.dev.vars`
- provider dashboardのprivate token

チャットに貼ってよいもの:

- 「Logo.devのkeyを登録済み」
- 「検索用secretは未登録」
- provider名

## 5. インポート運用

最初は空の `company_catalog` で問題ありません。CloudflareのD1ができた後に、次の段階で取り込みます。

1. JPXなどの公式データを作業用フォルダへ置く
2. import scriptで `company_catalog` 用のSQLへ変換する
3. D1に投入する
4. アプリ上で企業名検索、業種絞り込み、締切順/50音順/業種順を使う

CSVからSQLへ変換する例:

```bash
npm run catalog:sql -- --input ./work/jpx.csv --out ./work/company_catalog.sql
```

このscriptは、JPXや手動CSVの列名をいくつかの別名で受けます。最低限、企業名と証券コードがあると安定します。業種、市場区分、取引所、読み、ドメインがある場合は `company_catalog` に一緒に入れます。

public repo には、secret、実ユーザーデータ、DB dump、商用ロゴ画像そのものを入れません。
