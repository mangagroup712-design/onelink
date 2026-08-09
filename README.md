# OneLink

静的サイトだけの URL 短縮サービスです。GitHub Pages / Cloudflare Pages 向けです。

- 短縮リンク: `https://1lk.f5.si/{code}`
- 即時リンク: `https://1lk.f5.si/{payload}`（作成した瞬間からどのデバイスでも利用可）
- 旧ドメイン: `https://onelink.f5.si/` も同じサイトとして利用可能

## URL の形

### 即時短縮（デフォルト）

```
https://1lk.f5.si/{encoded}
```

行き先 URL をコンパクトに埋め込んだリンクです。サーバーやデータベースは不要で、作成直後からどのデバイスでも開けます。

### カスタムコード（任意）

```
https://1lk.f5.si/{code}
```

例: `https://1lk.f5.si/demo` → `https://example.com/`

## ファイル構成

```
kort/
  index.html      # 作成画面
  404.html        # 未作成パスのフォールバック
  links.json      # カスタムリンク一覧
  CNAME           # 1lk.f5.si
  .nojekyll
  css/main.css
  js/
  demo/index.html # 動作確認用サンプル
  serve.mjs       # ローカル用サーバー
```
