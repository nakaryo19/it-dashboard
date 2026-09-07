## 0. 事前準備

- [ ] 0.1 OpenAI アカウントで API キーを発行する
- [ ] 0.2 **OpenAI の Usage limits で月 $5 の上限を設定する**（課金事故防止・必須）
- [x] 0.3 Neon ダッシュボードで pgvector 拡張が利用可能なことを確認する
- [ ] 0.4 Neon の **pooled 接続文字列**を控える（Lambda から使用）
- [ ] 0.5 AWS アカウントを準備し、Terraform 実行用の IAM ユーザー/認証情報を用意する
- [ ] 0.6 `CLAUDE.md` / `AGENTS.md` に AI 層の開発方針を追記する

## 1. データモデル拡張（Week 1）

- [x] 1.1 マイグレーション SQL に `CREATE EXTENSION IF NOT EXISTS vector;` を追加する
- [x] 1.2 `schema.prisma` の `Article` に `bodyText String?` を追加する
- [x] 1.3 `schema.prisma` の `Article` に `embedding Unsupported("vector(1536)")?` を追加する
- [x] 1.4 `schema.prisma` の `Article` に `embeddingModel String?` を追加する
- [x] 1.5 `npx prisma migrate dev --name add_embedding` でマイグレーションを実行する
- [x] 1.6 既存の Prisma クエリ（`app/page.tsx`・`app/api/articles/route.ts`）が `Unsupported` 型追加後も動作することを確認する
  - 動作しない場合は `ArticleEmbedding` テーブルへの分離を検討する（design.md の Open Questions）
  - 検証結果: `Unsupported` の `embedding` は生成クライアントの型・runtimeDataModel から除外されるため既存クエリに影響なし。**テーブル分離は不要**

## 2. Qiita 本文取得（Week 1）

- [x] 2.1 `lib/scrapers/types.ts` の記事型に `bodyText?: string` を追加する
- [x] 2.2 `lib/scrapers/qiita.ts` で API v2 レスポンスの `body` を取得・格納する
- [x] 2.3 `app/api/scrape/route.ts` の upsert に `bodyText` を含める
- [x] 2.4 既存の Jest テストを更新し、本文取得のテストケースを追加する
- [x] 2.5 スクレイピングを実行し、Qiita 記事に `bodyText` が入ることを確認する

## 3. Python サービス: 埋め込み生成（Week 1）

- [x] 3.1 `ai-service/` ディレクトリを作成し、FastAPI プロジェクトを初期化する
- [x] 3.2 依存を最小限に定義する（`fastapi` / `openai` / `psycopg` / `mangum`。**不要な重量級ライブラリを入れない**）
- [x] 3.3 DB 接続モジュールを実装する（Neon の pooled 接続を使用）
- [x] 3.4 `POST /embed` を実装する
  - `embedding IS NULL` の記事を取得
  - タイトル＋`bodyText`（＋タグ）を結合して埋め込み対象テキストを構成
  - OpenAI Embeddings API を 100 件ずつバッチ呼び出し
  - `embedding` と `embeddingModel` を UPDATE
  - レート制限・APIエラー時のリトライとスキップ処理
- [x] 3.5 `GET /health` を実装する
- [x] 3.6 pytest で埋め込みロジックのテストを書く（OpenAI 呼び出しはモック）
- [x] 3.7 **ローカル実行で既存記事を一括埋め込みする**（初回・数十円）
- [x] 3.8 `SELECT count(*) FROM "Article" WHERE embedding IS NOT NULL;` で件数を確認する

## 4. Python サービス: 検索API（Week 2）

- [x] 4.1 `POST /search` を実装する
  - クエリ文字列を埋め込み化
  - pgvector のコサイン距離（`<=>`）で近傍検索
  - 記事 ID 配列とスコアを返す（上位 N 件、N はパラメータ化）
- [x] 4.2 類似度のカットオフ閾値を設ける（関連性の低い記事を除外）
- [x] 4.3 API キーによる簡易認証ミドルウェアを実装する
- [x] 4.4 CORS 設定（本番は Vercel ドメインのみ許可）
- [x] 4.5 pytest で検索ロジックのテストを書く
- [x] 4.6 ローカルで検索が意図通り動くことを確認する（タイトルに含まれない語で検索）

## 5. Next.js 側の検索UI（Week 2）

- [x] 5.1 `app/api/search/route.ts` を作成し、Python サービスへプロキシする GET ハンドラーを実装する
  - AI サービスの URL / API キーはサーバー側環境変数から読む
  - 記事 ID 配列を受け取り、Prisma で記事本体を取得
  - `source` / `status` フィルタを AND で適用
  - 検索結果の並び順（類似度順）を維持する
- [x] 5.2 `app/_components/SearchBox.tsx` を作成する（Client Component、URL の `q` と同期）
- [x] 5.3 検索 UI に「検索は記事の要約情報に基づきます」の注記を表示する
- [x] 5.4 `app/page.tsx` で `q` パラメータがある場合は検索結果を表示するよう分岐する
- [x] 5.5 検索結果0件時の空状態 UI を実装する
- [x] 5.6 AI サービスのエラー時に既存機能が動作し続けることを確認する
- [x] 5.7 Jest / Playwright のテストを追加する（検索、フィルタ併用、空状態）

## 6. インフラ構築（Week 3）

- [ ] 6.1 `ai-service/Dockerfile` を作成する（AWS Lambda Python ベースイメージ、依存最小）
- [ ] 6.2 `infra/` ディレクトリを作成し Terraform プロジェクトを初期化する
- [ ] 6.3 ECR リポジトリを定義する
- [ ] 6.4 Lambda（コンテナイメージ、メモリ 512MB）を定義する
- [ ] 6.5 **Lambda Function URL** を定義する（API Gateway は使わない）
- [ ] 6.6 SSM Parameter Store（SecureString）で OpenAI キー・DB 接続文字列を管理する
- [ ] 6.7 IAM ロールを最小権限で定義する（SSM 読み取り・CloudWatch Logs 書き込みのみ）
- [ ] 6.8 CloudWatch Logs のロググループを定義し、**保持期間を7日**に設定する
- [ ] 6.9 **VPC 設定を行わない**ことを確認する（NAT Gateway 課金の回避）
- [ ] 6.10 `terraform apply` を実行しデプロイする
- [ ] 6.11 Function URL に対して `/health` と `/search` の疎通確認を行う
- [ ] 6.12 コールドスタート時間を計測し、10秒を超える場合は依存・メモリを見直す

## 7. 本番接続と仕上げ（Week 4）

- [ ] 7.1 Vercel の環境変数に `AI_SERVICE_URL` / `AI_SERVICE_API_KEY` を設定する
- [ ] 7.2 本番デプロイし、検索が動作することを確認する
- [ ] 7.3 AWS のコスト実績を確認する（想定: 月100円以内）
- [ ] 7.4 `README.md` を更新する（アーキテクチャ構成、AI 層の説明、セットアップ手順）
- [ ] 7.5 `infra/README.md` に Terraform の実行手順を記載する
- [ ] 7.6 技術選定の判断理由を `docs/` にメモとして残す（職務経歴書への転記用）
- [ ] 7.7 Zenn 記事を1本執筆・公開する
  - 案: 「Neon の pgvector と Prisma で既存 Next.js アプリにセマンティック検索を足す」
  - Prisma が vector 型を扱えない件の回避策を含める
- [ ] 7.8 ポートフォリオサイトの Works を更新する
- [ ] 7.9 change を `openspec/changes/archive/` に移動し、`openspec/specs/` を更新する
