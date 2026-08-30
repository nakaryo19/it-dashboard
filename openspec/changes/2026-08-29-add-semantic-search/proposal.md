## Why

現在の記事一覧はソース・既読・お気に入りによるフィルタリングのみで、記事を探す手段はタイトルの目視に依存している。「あの非同期処理でつまずいた話、どこかで読んだ」のように、**内容は覚えているがタイトルを覚えていない**ケースで目的の記事に辿り着けない。

キーワード一致ではなく意味で記事を引けるようにすることで、蓄積された記事が「読み捨てのリスト」から「検索可能な知識ベース」に変わる。

あわせて本変更は、AI 機能（埋め込み・ベクトル検索）を既存プロダクトに組み込むための**基盤**を構築する。将来の RAG チャット・日次ダイジェスト（別 change として起票予定）は、ここで作る埋め込みデータとサービス基盤の上に載る。

## What Changes

- 記事の埋め込みベクトルを生成し、Neon PostgreSQL の pgvector に保存する
- 自然文クエリによる意味ベースの記事検索を追加する（既存フィルタと併用可能）
- AI 処理を担う **Python (FastAPI) サービス**を新設し、Terraform で AWS Lambda にデプロイする
- Qiita スクレイパーを拡張し、API v2 の `body` を保存する（埋め込み品質の向上）

## Capabilities

### New Capabilities

- `article-embedding`: 記事本文・タイトルから埋め込みベクトルを生成し、pgvector カラムに保存する
- `semantic-search`: 自然文クエリを埋め込みに変換し、類似度上位の記事を返す

### Modified Capabilities

- `article-fetch`: Qiita 取得時に記事本文（`body`）を併せて保存する

## Impact

- **新規依存**: OpenAI Embeddings API（`text-embedding-3-small`）、pgvector 拡張、Python 3.12 / FastAPI、Terraform
- **データベース**: `Article` に `embedding vector(1536)` と `bodyText` を追加。`CREATE EXTENSION vector` が必要
- **API Routes**: `/api/search`（GET）を新規追加（Python サービスへのプロキシ）
- **新規インフラ**: AWS Lambda（コンテナイメージ）、ECR、SSM Parameter Store、CloudWatch Logs
- **デプロイ先**: Vercel（環境変数 `AI_SERVICE_URL`・`AI_SERVICE_API_KEY` を追加）+ AWS（Terraform 管理）
- **運用コスト**: 月10円程度（埋め込み生成のみ。LLM 生成呼び出しは本変更に含まない）
