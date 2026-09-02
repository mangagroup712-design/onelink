# OneLink

Cloudflare Worker で動的に URL を短縮できるようにした URL 短縮サービスです。静的サイトとして使う場合は、即時リンクをさらに短くするために hash 形式の URL を採用しています。

- 動的短縮（Worker）: `https://1lk.f5.si/{code}`（1〜6文字の英数字）
- 即時短縮（静的）: `https://1lk.f5.si/#{payload}`
- 旧ドメイン: `https://onelink.f5.si/` も同じサイトとして利用可能

## URL の形

### 動的短縮（Cloudflare Worker）

```
https://1lk.f5.si/{code}
```

Worker 側で KV に保存した `code -> url` の対応を見てリダイレクトします。自動生成コードとカスタムコードは、どちらも大文字小文字を区別する1〜6文字の英数字です。

### 即時短縮（静的サイト）

```
https://1lk.f5.si/#{payload}
```

`/{payload}` より 1 文字短くなるよう、ルートの hash にペイロードを埋め込みます。サーバーや DB を使わず、作成直後からどのデバイスでも利用できます。

### カスタムコード（静的サイト時）

```
https://1lk.f5.si/{code}
```

例: `https://1lk.f5.si/demo` → `https://example.com/`

カスタムコードは `links.json` と `{code}/index.html` をリポジトリへ Push して公開します。

## 仕組み

### Worker モード

1. `POST /api/shorten` で URL と任意のカスタムコードを受け取る
2. KV / in-memory に `code -> url` を保存する
3. `GET /{code}` で 302 リダイレクトを返す
4. 使わない URL は `encodeDestination` の圧縮ペイロードと互換する形式でも転送可能

### 静的モード

1. `#payload` 形式の URL をブラウザ側で復号して転送
2. `links.json` に定義されたカスタムコードを読む
3. `404.html` / `index.html` でフォールバック

## Cloudflare Worker の設定

```bash
wrangler login
wrangler kv namespace create LINKS
```

`wrangler.toml` の `id = "REPLACE_WITH_KV_NAMESPACE_ID"` を実際の KV ID に置き換えてデプロイします。

```bash
wrangler deploy
```

`wrangler.toml` の `assets` 設定により、Worker と同じドメインでこのリポジトリの静的ファイルも配信します。したがって通常は `ONELINK_WORKER_BASE` の設定は不要です。別ドメインの Worker を使う場合だけ、`index.html` より前に `window.ONELINK_WORKER_BASE = "https://<worker-domain>"` を設定してください。

### GitHub から Cloudflare へ公開する場合

GitHub リポジトリを Cloudflare の Workers & Pages に接続するだけでは、KV の接続情報やカスタムドメインまでは自動設定されません。次の作業が必要です。

1. Cloudflare で KV namespace `LINKS` を作成する
2. 発行された namespace ID を `wrangler.toml` の `id` に設定する
3. `wrangler deploy`、または Workers の Git デプロイ設定でこのリポジトリをビルド・デプロイする
4. `1lk.f5.si` を Worker の Custom Domain / Route に割り当てる

GitHub Actions でデプロイする場合は、`CLOUDFLARE_API_TOKEN` などの秘密情報を GitHub Secrets に登録し、そこで `wrangler deploy` を実行します。KV ID が placeholder のままだと本番デプロイできません。

### Cloudflare Dashboard から直接アップロードする場合

`worker.js` は静的ファイルを必要としない単体 Worker として動作します。Cloudflare Dashboard の **Workers & Pages → Create → Worker → Deploy → Edit code** で `worker.js` の内容を貼り付けて保存・デプロイできます。

ただし、コードを保存する KV は Dashboard 側で別途作成して、この Worker の **Settings → Bindings → KV namespace bindings** に次の名前で追加してください。

```text
Variable name: LINKS
KV namespace: 作成した LINKS namespace
```

KV を設定しない場合も一時的なメモリ保存で動作しますが、Worker の再起動やインスタンス変更で短縮データが消えるため本番利用には適しません。ルートページも `worker.js` に内蔵しているため、Dashboard へのファイル単体アップロードでは `assets` 設定や GitHub Pages の設定は不要です。

## ローカルで試す

```bash
npm start
```

ブラウザで http://localhost:8080 を開きます。同じ Wi-Fi 内の他デバイスからは、PC の LAN IP（例: `http://192.168.x.x:8080`）でアクセスできます。

http://localhost:8080/demo でカスタムコードのリダイレクトも確認できます。

## GitHub Pages / DNS

1. Pages の Branch は `v1.0` / root（または Cloudflare Pages の出力ディレクトリをリポジトリ直下に）
2. カスタムドメイン（プライマリ）: `1lk.f5.si`（`CNAME` ファイル済み）
3. DNS:
   - `1lk.f5.si` → `mangagroup712-design.github.io`（CNAME）
   - `onelink.f5.si` → `mangagroup712-design.github.io`（CNAME）※旧ドメイン継続用

### カスタムコードの増やし方

1. トップページで「カスタムコードを使う」を開き、URL を短縮する
2. 「公開用ファイルをダウンロード」
3. 保存された `links.json` でリポジトリの同名ファイルを上書き
4. 保存された `{コード}__index.html` を `{コード}/index.html` として配置
5. Push → Pages 反映後に `https://1lk.f5.si/{コード}` が使える

## ファイル構成

```
onelink/
  index.html      # 作成画面
  404.html        # 未作成パスのフォールバック
  links.json      # カスタムリンク一覧
  worker.js       # Cloudflare Worker の動的短縮ロジック
  wrangler.toml   # Worker 設定
  CNAME           # 1lk.f5.si
  .nojekyll
  css/main.css
  js/
  demo/index.html # 動作確認用サンプル
  serve.mjs       # ローカル用サーバー
```
