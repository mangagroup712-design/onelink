# OneLink

静的サイトだけの URL 短縮サービスです。GitHub Pages + カスタムドメイン向けです。

- 短縮リンク: `https://1lk.f5.si/{code}`
- 旧ドメイン: `https://onelink.f5.si/` も同じサイトとして利用可能（DNS を同じ GitHub Pages に向ける）

## URL の形

```
https://1lk.f5.si/{code}
```

例: `https://1lk.f5.si/demo` → `https://example.com/`

`https://onelink.f5.si/demo` でも同じリダイレクトが動きます（DNS 設定済みの場合）。

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

## GitHub Pages / DNS

1. Pages の Branch は `v1.0` / root
2. カスタムドメイン（プライマリ）: `1lk.f5.si`（`CNAME` ファイル済み）
3. DNS:
   - `1lk.f5.si` → `mangagroup712-design.github.io`（CNAME）
   - `onelink.f5.si` → `mangagroup712-design.github.io`（CNAME）※旧ドメイン継続用

### リンクの増やし方

1. トップページで URL を短縮する
2. 「公開用ファイルをダウンロード」
3. 保存された `links.json` でリポジトリの同名ファイルを上書き
4. 保存された `{コード}__index.html` を `{コード}/index.html` として配置
5. Push → Pages 反映後に `https://1lk.f5.si/{コード}` が使える

## ファイル構成

```
onelink/
  index.html      # 作成画面
  404.html        # 未作成パスのフォールバック
  links.json      # リンク一覧
  CNAME           # 1lk.f5.si
  .nojekyll
  css/main.css
  js/
  demo/index.html # 動作確認用サンプル
  serve.mjs       # ローカル用サーバー
```
