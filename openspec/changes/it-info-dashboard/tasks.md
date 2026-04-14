## 1. 環境・依存関係のセットアップ

- [x] 1.1 Prisma と `@prisma/client` をインストールする（`npm install prisma @prisma/client`）
- [x] 1.2 `npx prisma init` で `prisma/schema.prisma` と `.env` を生成する
- [x] 1.3 `schema.prisma` に `Article` モデルと `SourceType` enum を定義する
- [x] 1.4 Neon PostgreSQL の接続文字列を `.env` の `DATABASE_URL` に設定する手順をドキュメント化する（実際の値は `.env.local` に記載、`.gitignore` に追加）
- [x] 1.5 `npx prisma migrate dev --name init` で初回マイグレーションを実行する
- [x] 1.6 XML パース用に `fast-xml-parser` をインストールする（Zenn RSS 用）

## 2. スクレイパー実装

- [x] 2.1 `lib/scrapers/zenn.ts` を作成し、RSS フィードから記事を取得・パースする
- [x] 2.2 `lib/scrapers/qiita.ts` を作成し、Qiita API v2 から記事を取得・パースする
- [x] 2.3 `lib/scrapers/github-trending.ts` を作成し、GitHub Trending HTML を fetch してリポジトリ情報をパースする
- [x] 2.4 `lib/scrapers/hacker-news.ts` を作成し、HN Firebase API から Top Stories を取得・パースする
- [x] 2.5 `lib/scrapers/index.ts` を作成し、全スクレイパーを `Promise.allSettled` で並列実行するエントリーポイントを実装する

## 3. API Route 実装

- [x] 3.1 `app/api/scrape/route.ts` を作成し、スクレイパーを呼び出して結果を Prisma で upsert する POST ハンドラーを実装する
- [x] 3.2 `app/api/articles/route.ts` を作成し、`source` / `status` クエリパラメータでフィルタリングする GET ハンドラーを実装する
- [x] 3.3 `app/api/articles/[id]/read/route.ts` を作成し、`isRead` をトグルする PATCH ハンドラーを実装する
- [x] 3.4 `app/api/articles/[id]/favorite/route.ts` を作成し、`isFavorite` をトグルする PATCH ハンドラーを実装する

## 4. UI コンポーネント実装

- [x] 4.1 `app/_components/ScrapeButton.tsx` を実装する（Client Component、`/api/scrape` POST 呼び出し、ローディング状態表示）
- [x] 4.2 `app/_components/FilterBar.tsx` を実装する（Client Component、ソース・ステータスフィルター、URL search params と同期）
- [x] 4.3 `app/_components/ArticleCard.tsx` を実装する（記事タイトル・ソース・公開日・タグ・既読ボタン・お気に入りボタン表示）
- [x] 4.4 `app/_components/ArticleList.tsx` を実装する（Client Component、記事リスト表示・既読/お気に入りトグルの楽観的 UI 更新）

## 5. ページ実装

- [x] 5.1 `app/page.tsx` を Server Component として実装し、URL search params に基づき Prisma で記事を取得して `ArticleList` に渡す
- [x] 5.2 記事が0件・お気に入りが0件の場合の空状態 UI を実装する
- [x] 5.3 記事タイトルクリック時に自動既読化するロジックを `ArticleCard` に追加する

## 6. スタイリング・仕上げ

- [x] 6.1 Tailwind CSS でレスポンシブな記事カードレイアウトを整える
- [x] 6.2 ソース別にバッジカラーを設定する（Zenn・Qiita・GitHub・HN で識別しやすく）
- [x] 6.3 スクレイピング実行中のローディングオーバーレイまたはトースト通知を実装する

## 7. デプロイ準備

- [x] 7.1 `package.json` の `build` スクリプトに `prisma generate` を追加する（Vercel ビルド対応）
- [x] 7.2 Vercel プロジェクトに `DATABASE_URL` 環境変数を設定する手順を確認する
- [ ] 7.3 Vercel にデプロイし、スクレイピング・一覧表示・既読・お気に入りの動作を本番環境で確認する
