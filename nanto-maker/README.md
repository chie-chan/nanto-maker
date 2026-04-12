# なんと！？ 衝撃SNS画像メーカー

ペット写真に集中線＆衝撃テキストを追加してSNS映え画像を即作成！
完全無料・ブラウザだけで完結（サーバー不要）。

---

## Cloudflare Pages にデプロイする手順

### ① GitHubにアップロード

1. https://github.com にログイン（アカウントがなければ無料作成）
2. 右上「＋」→「New repository」
3. Repository name: `nanto-maker` → 「Create repository」
4. 表示されたページの「uploading an existing file」をクリック
5. このフォルダの中身を全部ドラッグ＆ドロップ → 「Commit changes」

### ② Cloudflare Pages に接続

1. https://pages.cloudflare.com にアクセス（無料アカウント作成）
2. 「Create a project」→「Connect to Git」
3. GitHubアカウントを連携 → `nanto-maker` リポジトリを選択
4. ビルド設定を以下に変更：
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
5. 「Save and Deploy」をクリック

### ③ 完了！

数分でURLが発行されます（例: `nanto-maker.pages.dev`）
そのURLをXやInstagramでシェアすれば公開完了です🎉

---

## ローカルで動かす場合

```bash
npm install
npm run dev
```

http://localhost:5173 で確認できます。
