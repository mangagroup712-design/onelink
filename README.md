# OneLink

静的サイトだけの URL 短縮サービスです。GitHub Pages / Cloudflare Pages 向けです。

- 短縮リンク: `https://1lk.f5.si/{code}`
- 即時リンク: `https://1lk.f5.si/~{payload}`（作成した瞬間からどのデバイスでも利用可）
- 旧ドメイン: `https://onelink.f5.si/` も同じサイトとして利用可能

## URL の形

### 即時短縮（デフォルト）

```
https://1lk.f5.si/~{encoded}
```

行き先 URL をリンク自体に埋め込むため、サーバーやデータベースは不要です。作成直後から、どのデバイスでも開けます。

### カスタムコード（任意）

```
https://1lk.f5.si/{code}
```

例: `https://1lk.f5.si/demo` → `https://example.com/`

カスタムコードは `links.json` と `{code}/index.html` をリポジトリへ Push して公開します。

## 仕組み

GitHub Pages / Cloudflare Pages はサーバー処理ができないため、次の静的な方法で動かします。

1. **即時リンク `/~…`** … 404 フォールバック上の JS がペイロードを復号して転送
2. **`links.json`** … カスタムコードと行き先 URL の対応表
3. **`{code}/index.html`** … カスタムコード専用のリダイレクト HTML（高速・確実）
4. **`404.html`** … 未作成パス向けのフォールバック

## ローカルで試す

```bash
cd C:\Users\takum\kort
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
kort/
  index.html      # 作成画面
  404.html        # 未作成パスのフォールバック
  links.json      # カスタムリンク一覧
  CNAME           # カスタムドメイン
  .nojekyll
  css/main.css
  js/
  demo/index.html # 動作確認用サンプル
  serve.mjs       # ローカル用サーバー
```
