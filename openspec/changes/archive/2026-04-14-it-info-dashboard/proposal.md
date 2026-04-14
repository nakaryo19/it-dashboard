## Why

エンジニアが毎日 Zenn・Qiita・GitHub Trending・Hacker News を個別に巡回するのは非効率で、重要な情報を見落としやすい。IT情報収集ダッシュボードを構築することで、複数ソースの最新情報を一元管理し、既読管理・お気に入り機能により情報のノイズを減らす。

## What Changes

- **新規プロジェクト**: IT情報収集ダッシュボードの初期実装（既存コードベースへの変更なし）
- 手動トリガーによるスクレイピング実行機能（Zenn・Qiita・GitHub Trending・Hacker News）
- 取得した記事の一覧表示（ソース・タイトル・日付・タグ）
- 記事の既読／未読ステータス管理
- 記事のお気に入り登録・解除

## Capabilities

### New Capabilities

- `article-fetch`: 各ソース（Zenn・Qiita・GitHub Trending・Hacker News）から記事を手動スクレイピングして DB に保存する
- `article-list`: 取得済み記事をフィルター・ソート付きで一覧表示する
- `read-status`: 記事ごとの既読／未読ステータスをユーザーが管理できる
- `favorites`: 記事をお気に入り登録・解除できる

### Modified Capabilities

## Impact

- **新規依存**: Prisma ORM、Neon PostgreSQL（接続文字列環境変数）、Tailwind CSS（既に設定済み想定）
- **データベース**: `Article`・`Source` テーブルを新規作成
- **API Routes**: `/api/scrape`（POST）・`/api/articles`（GET）・`/api/articles/[id]/read`（PATCH）・`/api/articles/[id]/favorite`（PATCH）
- **デプロイ先**: Vercel（環境変数 `DATABASE_URL` 設定が必要）
