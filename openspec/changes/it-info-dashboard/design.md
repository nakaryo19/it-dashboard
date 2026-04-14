## Context

新規の Next.js App Router プロジェクトに IT情報収集ダッシュボードを構築する。対象ソースは Zenn・Qiita・GitHub Trending・Hacker News の4つ。データ永続化に Neon PostgreSQL + Prisma を使用し、Vercel にデプロイする。スクレイピングはサーバーサイド（API Route）で実行し、クライアントからの手動トリガーに応じて動作する。

## Goals / Non-Goals

**Goals:**
- 4ソースから記事メタデータ（タイトル・URL・日付・タグ・ソース種別）を取得して DB に保存
- 記事一覧を Server Component で表示（フィルター: ソース・既読/未読/お気に入り）
- 既読・お気に入りの状態を DB で管理し、楽観的 UI 更新で操作性を向上
- Vercel デプロイ対応（環境変数 `DATABASE_URL` のみ設定）

**Non-Goals:**
- 自動定期スクレイピング（cron・バックグラウンドジョブ）
- ユーザー認証・マルチユーザー対応
- 記事本文のフルテキスト取得・全文検索
- プッシュ通知

## Decisions

### スクレイピング方式: 外部 API / RSS フィードを優先、DOM スクレイピングは最終手段

- **Zenn**: 公式 RSS フィード (`https://zenn.dev/feed`) を利用
- **Qiita**: 公式 API v2 (`/api/v2/items`) を利用（API キー不要でレートリミット内）
- **GitHub Trending**: HTML スクレイピング（公式 API なし）
- **Hacker News**: 公式 Firebase API (`https://hacker-news.firebaseio.com/v0/`) を利用

**Alternatives considered**: Puppeteer/Playwright によるブラウザ自動化 → Vercel の関数実行時間制限（10〜60秒）に収まらないリスクがあるため不採用。

### データモデル

```
Article {
  id          String   @id @default(cuid())
  sourceType  SourceType  // ZENN | QIITA | GITHUB_TRENDING | HACKER_NEWS
  title       String
  url         String   @unique
  publishedAt DateTime?
  tags        String[] // Prisma Array (Neon PostgreSQL)
  isRead      Boolean  @default(false)
  isFavorite  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

単一テーブル設計とする。ソース別テーブルへの正規化は現状のクエリパターンに対してオーバーエンジニアリングになるため採用しない。

### API 設計

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/scrape` | 全ソースまたは指定ソースのスクレイピング実行 |
| GET | `/api/articles` | 記事一覧（クエリ: source, status=read/unread/favorite） |
| PATCH | `/api/articles/[id]/read` | 既読トグル |
| PATCH | `/api/articles/[id]/favorite` | お気に入りトグル |

### フロントエンド構成

- `app/page.tsx`: Server Component。初期記事一覧を SSR で取得
- `app/_components/ArticleList.tsx`: Client Component。フィルター状態管理・楽観的更新
- `app/_components/ScrapeButton.tsx`: Client Component。`/api/scrape` を呼び出し、完了後リスト再取得
- フィルターは URL search params で管理（`?source=zenn&status=unread`）

## Risks / Trade-offs

- **GitHub Trending HTML 構造変更** → スクレイパーが壊れる。影響範囲はそのソースのみに限定。定期的な動作確認が必要。
- **Qiita API レートリミット** (未認証: 60req/h) → スクレイピング頻度が高い場合に影響。手動実行のみなので通常は問題なし。
- **Vercel 関数タイムアウト** → 4ソース並列フェッチで通常 5〜15 秒。Vercel Hobby の 10 秒制限に抵触する可能性あり。`Promise.allSettled` で部分的成功を許容し、失敗ソースはスキップする。
- **Neon PostgreSQL コールドスタート** → 初回クエリに数百ミリ秒かかる場合あり。UX への影響は軽微。

## Migration Plan

1. Neon PostgreSQL データベース作成 → 接続文字列取得
2. `DATABASE_URL` を Vercel 環境変数に設定
3. `npx prisma migrate deploy` を Vercel ビルドフックで実行
4. ロールバック: マイグレーションは additive のみ（カラム削除なし）なので通常は不要

## Open Questions

- GitHub Trending のスクレイピングに `node-fetch` + `cheerio` を使うか、または Node.js 標準 `fetch` + 正規表現パースにするか（依存ライブラリ最小化の観点から後者を検討中）
