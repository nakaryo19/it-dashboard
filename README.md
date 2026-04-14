# IT情報収集ダッシュボード

Zenn・Qiita・GitHub Trending・Hacker News の最新記事を一元管理するダッシュボードです。手動スクレイピング実行・既読管理・お気に入り機能を備えています。

## 機能

- **記事取得** — ボタン1つで4ソースから最新記事を取得（手動実行）
- **記事一覧** — ソース・既読/未読/お気に入りでフィルタリング
- **既読管理** — 記事タイトルクリックで自動既読、ボタンでトグル
- **お気に入り** — 気になる記事を★でブックマーク

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) |
| データベース | Neon PostgreSQL |
| ORM | Prisma 7 |
| スタイリング | Tailwind CSS 4 |
| テスト | Jest + ts-jest |
| デプロイ | Vercel |

## 対応ソース

| ソース | 取得方法 |
|---|---|
| Zenn | RSS フィード |
| Qiita | API v2 |
| GitHub Trending | HTML スクレイピング |
| Hacker News | Firebase REST API |

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

`.env` ファイルの `DATABASE_URL` に Neon PostgreSQL の接続文字列を設定します。

```bash
# .env
DATABASE_URL="postgresql://<user>:<password>@<host>/<dbname>?sslmode=require"
```

[Neon](https://neon.tech) でデータベースを作成し、接続文字列を取得してください。

### 3. データベースのマイグレーション

```bash
npx prisma migrate dev --name init
```

### 4. 開発サーバーの起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) にアクセスしてください。

## スクリプト

```bash
npm run dev          # 開発サーバー起動
npm run build        # 本番ビルド（prisma generate を含む）
npm run start        # 本番サーバー起動
npm test             # テスト実行
npm run test:coverage  # カバレッジ付きテスト実行
```

## デプロイ（Vercel）

1. Vercel プロジェクトの環境変数に `DATABASE_URL` を設定
2. GitHub リポジトリを Vercel に連携してデプロイ

本番環境では `npm run build`（`prisma generate && next build`）が自動実行されます。

## プロジェクト構成

```
├── app/
│   ├── _components/     # UI コンポーネント
│   ├── api/             # API Routes
│   └── page.tsx         # メインページ（Server Component）
├── lib/
│   ├── prisma.ts        # Prisma クライアント
│   └── scrapers/        # 各ソースのスクレイパー
├── prisma/
│   ├── schema.prisma    # データモデル
│   └── migrations/      # マイグレーションファイル
└── __tests__/           # ユニットテスト
    ├── api/
    └── scrapers/
```
