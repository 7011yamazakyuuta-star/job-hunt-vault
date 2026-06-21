# Cloudflare Setup Guide

このドキュメントは、Job Hunt Vault を Cloudflare Workers 上で動かすために、あなたが Cloudflare / Google 側で行う作業と、このチャットで Codex に伝えるべきことをまとめた手順書です。

public repo なので、実データ、secret、`.env`、`.dev.vars`、DB dump、R2 の実画像ファイルは commit しないでください。

## まず大事なルール

Codex に貼ってよいもの:

- Cloudflare account ID
- D1 database name
- D1 database ID
- R2 bucket name
- Worker name
- Worker URL
- Google OAuth の redirect URI
- 「secret を登録した」という完了報告

Codex に貼らないもの:

- `GOOGLE_CLIENT_SECRET`
- `SESSION_SECRET`
- `TURNSTILE_SECRET_KEY`
- `LOGO_PROVIDER_API_KEY`
- `.env`
- `.dev.vars`
- 実際のログインID、パスワード、個人メモ、就活データ
- DB dump や export
- 実写真や実画像

迷ったら、このチャットでは値を貼らずに「これはsecretですか？」と聞いてください。

## このチャットであなたにお願いすること

実装を進める途中で Cloudflare 側の値が必要になったら、Codex は次のように聞きます。

```text
D1 database_id を教えてください。これはsecretではありません。
```

そのときは `database_id` だけ貼ってください。

secret が必要な場面では、Codex は値を聞きません。代わりに次のように依頼します。

```text
Cloudflareで SESSION_SECRET を登録してください。登録できたら「登録済み」とだけ教えてください。
```

そのときは secret の中身を貼らずに、登録できたかどうかだけ返してください。

## 1. Wrangler にログインする

ローカルで Cloudflare CLI を使えるようにします。

```bash
npx wrangler login
```

ブラウザが開くので、Cloudflare にログインして許可します。

このチャットで Codex に伝えること:

```text
wrangler login 済みです
```

## 2. D1 Database を作る

D1 は users、rooms、companies、progress、Vault の encrypted payload などを保存するDBです。

```bash
npx wrangler d1 create job-hunt-vault
```

表示される `database_id` を `wrangler.jsonc` に入れます。

例:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "job-hunt-vault",
    "database_id": "ここを実際のdatabase_idに置き換える",
    "migrations_dir": "drizzle/migrations"
  }
]
```

このチャットで Codex に伝えること:

```text
D1 database_id は xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx です
```

注意:

- `database_id` は secret ではありません。
- `binding` は `DB` のままにしてください。

## 3. R2 Bucket を作る

R2 は avatar photo を保存します。bucket は public にしません。

```bash
npx wrangler r2 bucket create job-hunt-vault-avatars
```

`wrangler.jsonc` は次の binding を使います。

```jsonc
"r2_buckets": [
  {
    "binding": "AVATAR_BUCKET",
    "bucket_name": "job-hunt-vault-avatars"
  }
]
```

このチャットで Codex に伝えること:

```text
R2 bucket job-hunt-vault-avatars を作成済みです
```

注意:

- bucket を public にしないでください。
- raw R2 URL は公開しません。
- avatar 画像は Worker の認可済みAPI経由で配信します。

## 4. Google OAuth Client を作る

Google Cloud Console で OAuth client を作ります。

1. Google Cloud Console を開く。
2. APIs & Services に進む。
3. OAuth consent screen を設定する。
4. Credentials で OAuth client ID を作る。
5. Application type は Web application を選ぶ。
6. Authorized redirect URI に callback URL を追加する。

本番の callback URL:

```text
https://<your-worker-domain>/api/auth/google/callback
```

workers.dev の例:

```text
https://job-hunt-vault.<your-subdomain>.workers.dev/api/auth/google/callback
```

ローカル `wrangler dev` の例:

```text
http://127.0.0.1:8787/api/auth/google/callback
```

このチャットで Codex に伝えること:

```text
Google OAuth client を作成済みです。redirect URI は https://.../api/auth/google/callback です
```

貼ってはいけないもの:

- Google client secret

## 5. Workers Secrets を登録する

本番用 secret は Cloudflare Workers Secrets に入れます。

```bash
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put SESSION_SECRET
```

任意:

```bash
npx wrangler secret put TURNSTILE_SECRET_KEY
npx wrangler secret put LOGO_DEV_SECRET_KEY
npx wrangler secret put LOGO_DEV_PUBLISHABLE_KEY
```

`SESSION_SECRET` は長くランダムな文字列にしてください。ローカルで生成する例:

```bash
node -e "console.log(crypto.randomBytes(32).toString('hex'))"
```

このチャットで Codex に伝えること:

```text
GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / SESSION_SECRET を登録済みです
```

貼ってはいけないもの:

- secret の実際の値

## 6. Local Mock Auth を使う場合

Google OAuth をまだ使わずにローカル開発する場合だけ、mock user を明示的に有効化できます。

ローカルの `.dev.vars` にだけ書きます。commit しないでください。

```bash
LOCAL_AUTH_ENABLED=true
LOCAL_AUTH_EMAIL=dev@example.com
LOCAL_AUTH_NAME=Dev User
SESSION_SECRET=<local-only-random-secret>
```

このチャットで Codex に伝えること:

```text
local mock auth を使います
```

または:

```text
本番と同じ Google OAuth で進めます
```

## 7. Migration を適用する

ローカルD1:

```bash
npx wrangler d1 migrations apply job-hunt-vault --local
```

Cloudflare上のD1:

```bash
npx wrangler d1 migrations apply job-hunt-vault --remote
```

このチャットで Codex に伝えること:

```text
D1 migration を remote に適用済みです
```

## 8. Binding 型を更新する

`wrangler.jsonc` の binding を変えたら、型定義を更新します。

```bash
npm run cf-typegen
```

生成される `worker-configuration.d.ts` は commit して構いません。

このチャットで Codex に伝えること:

```text
cf-typegen を実行済みです
```

## 9. ローカルで検証する

依存関係:

```bash
npm install
```

Worker:

```bash
npm run dev:worker
```

React:

```bash
npm run dev
```

必ず実行する確認:

```bash
npm run typecheck
npm test
npm run build
```

このチャットで Codex に伝えること:

```text
typecheck / test / build が通りました
```

エラーが出た場合は、secretや個人情報を含まない範囲でエラーメッセージを貼ってください。

## 10. Deploy

本番 deploy 前に migration と secrets が入っていることを確認してください。

```bash
npm run build
npx wrangler deploy
```

このチャットで Codex に伝えること:

```text
deploy 済みです。Worker URL は https://... です
```

Worker URL は secret ではありません。貼ってOKです。

## 11. よくあるつまずき

### Google login 後に `Authentication is not configured`

Cloudflare Workers Secrets に `GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`SESSION_SECRET` が入っているか確認してください。

このチャットでは secret 値を貼らず、登録済みかどうかだけ教えてください。

### Google login 後に `Google authentication failed`

Google OAuth client の redirect URI が、実際の Worker URL と完全一致しているか確認してください。

このチャットでは redirect URI を貼ってOKです。

### Room API が 401 になる

本番では Google login session が必要です。ローカルだけ mock auth を使う場合は `LOCAL_AUTH_ENABLED=true` を明示してください。

### Avatar が表示されない

R2 bucket が作成済みで、binding 名が `AVATAR_BUCKET` のままか確認してください。bucket を public にする必要はありません。

## 12. 安全チェック

作業後に確認してください:

- `.env` を commit していない。
- `.dev.vars` を commit していない。
- DB dump や export を commit していない。
- 実写真や実画像を commit していない。
- secret をPR説明やIssueに貼っていない。
- secret をこのチャットに貼っていない。
- R2 bucket を public にしていない。
## 13. 企業辞書とロゴ取得を使う場合

企業ロゴをWordのオンライン画像検索に近い感覚で使う場合は、Logo.devなどのprovider keyをCloudflareに登録します。

Cloudflareで触る場所:

1. Cloudflare Dashboardを開く
2. Workers & Pages
3. `job-hunt-vault`
4. Settings
5. Variables and Secrets
6. Add

登録するもの:

```bash
npx wrangler secret put LOGO_DEV_SECRET_KEY
npx wrangler secret put LOGO_DEV_PUBLISHABLE_KEY
```

`LOGO_DEV_SECRET_KEY` は企業名検索API用です。チャット、GitHub、`.env`、`.dev.vars` に貼らないでください。

`LOGO_DEV_PUBLISHABLE_KEY` は画像CDN用のpublishable keyです。公開可能keyですが、運用を単純にするためCloudflare側に置いてください。

このチャットでCodexに伝えてよいこと:

```text
Logo.dev の LOGO_DEV_SECRET_KEY と LOGO_DEV_PUBLISHABLE_KEY を登録済みです。
```

伝えないこと:

- keyの実際の値
- Logo.dev dashboardのprivate token
- `.env`
- `.dev.vars`

JPXなどの企業辞書を入れる場合は、まずD1 databaseを作成してmigrationを適用します。migrationで `companies` には読み、直近締切、証券コード、取引所の列が作られ、`company_catalog` にはJPXなどの参照データを入れる列が作られます。

Cloudflare上で手で触るところ:

1. Workers & Pages
2. `job-hunt-vault`
3. Settings
4. D1 database binding が `DB` になっていることを確認
5. migrationを適用

その後、公式データを `company_catalog` にimportします。詳細な設計は `docs/DATA_CATALOG.md` を見てください。

CSVをSQLに変換する例:

```bash
npm run catalog:sql -- --input ./work/jpx.csv --out ./work/company_catalog.sql
```

D1へ投入する例:

```bash
npx wrangler d1 execute job-hunt-vault --remote --file ./work/company_catalog.sql
```

`./work/jpx.csv` や `./work/company_catalog.sql` は作業用ファイルです。実データやDB exportをpublic repoへcommitしないでください。

この段階でCodexに伝えてよいこと:

```text
D1 migrationまで完了しました。次はJPX企業辞書のimportに進んでください。
```
