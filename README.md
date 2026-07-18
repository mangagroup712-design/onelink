# OneLink

静的サイトだけの URL 短縮サービスです。GitHub Pages + カスタムドメイン `onelink.f5.si` 向けです。

## URL の形

```
https://onelink.f5.si/{code}
```

例: `https://onelink.f5.si/demo` → `https://example.com/`

## 仕組み

GitHub Pages はサーバー処理ができないため、次の静的な方法で動かします。

1. **`links.json`** … 短いコードと行き先 URL の対応表
2. **`{code}/index.html`** … そのコード専用のリダイレクト HTML（高速・確実）
3. **`404.html`** … フォルダがまだ無いコード向けのフォールバック（`links.json` を見て転送）

## ローカルで試す

```bash
cd C:\Users\takum\onelink
node serve.mjs
```

ブラウザで http://localhost:8080 を開き、http://localhost:8080/demo でリダイレクトを確認できます。

## GitHub Pages への載せ方

1. このリポジトリを GitHub に置く
2. Settings → Pages → Branch を `main` / root に設定
3. カスタムドメインに `onelink.f5.si` を設定（リポジトリ内の `CNAME` 済み）
4. DNS で `onelink.f5.si` を GitHub Pages 向けに向ける（A / CNAME）

### リンクの増やし方

1. トップページで URL を短縮する
2. 「公開用ファイルをダウンロード」
3. 保存された `links.json` でリポジトリの同名ファイルを上書き
4. 保存された `{コード}__index.html` を `{コード}/index.html` として配置
5. Push → Pages 反映後に `https://onelink.f5.si/{コード}` が使える

## ファイル構成

```
onelink/
  index.html      # 作成画面
  404.html        # 未作成パスのフォールバック
  links.json      # リンク一覧
  CNAME           # onelink.f5.si
  .nojekyll
  css/main.css
  js/
  demo/index.html # 動作確認用サンプル
  serve.mjs       # ローカル用サーバー
```
