## Context

既存の Next.js (App Router) + Neon PostgreSQL + Prisma + Vercel 構成に、AI 層を追加する。本 change はその第1段（Phase A）として、埋め込み生成とセマンティック検索のみを対象とする。

本プロジェクトの目的は収益化ではなく、**AI 開発スキルの習得と転職用ポートフォリオの構築**にある。したがって技術選定は「実務で問われる技術に触れられるか」と「運用コストを限りなく低く保てるか」の2軸で判断する。

## Goals / Non-Goals

**Goals:**
- 収集済み記事の埋め込みを pgvector に保存し、自然文で検索できる
- AI 処理を Python (FastAPI) サービスとして分離し、Terraform で AWS に構築する
- 運用コストを月100円以内に収める
- 既存機能（記事一覧・フィルタ・既読・お気に入り）に劣化を与えない

**Non-Goals:**
- LLM による生成（RAG チャット・要約ダイジェスト）→ 別 change
- 記事取得の自動化（cron）→ 別 change
- 回答品質の自動評価基盤
- ユーザー認証・マルチユーザー対応
- Zenn / Hacker News / GitHub Trending の本文全文取得（§Risks 参照）

## Decisions

### 実行基盤: AWS Lambda（コンテナイメージ）+ Function URL

Python サービスの実行基盤として Lambda を選択する。

- **常駐コストがゼロ**。個人利用（1日数十リクエスト）では無料枠に収まる
- **VPC に配置しない**。Neon はパブリックエンドポイントを提供するため VPC 不要であり、VPC を使うと NAT Gateway が必要になり**月約4,500円**が発生する。予算制約に対して致命的
- API Gateway ではなく **Lambda Function URL** を使う。認証・ルーティングは単純な1エンドポイントで足り、API Gateway のリクエスト課金を回避できる
- CloudWatch Logs の保持期間は **7日**に設定する（デフォルトの無期限はストレージコストになる）

**Alternatives considered**:
- **Fargate 常駐** → コールドスタートは無いが月数千円かかり予算超過。不採用
- **Vercel の Python Runtime** → デプロイは最も簡単だが、Terraform / AWS の実績を作るという本プロジェクトの目的を満たさないため不採用
- **Next.js 内で TypeScript のまま実装** → 最速だが Python 実績を作れないため不採用

### ベクトルストア: Neon の pgvector 拡張

専用ベクトル DB（Pinecone 等）は導入せず、既存 Neon PostgreSQL の pgvector を使う。

- 追加サービス・追加コストがゼロ
- 記事数は数千件規模であり、pgvector の逐次スキャンで十分高速
- インデックス（HNSW 等）は**当面作成しない**。数千件では不要であり、必要になった時点で追加する

### 埋め込みモデル: OpenAI `text-embedding-3-small`（1536次元）

- $0.02 / 100万トークンと安価。数千記事の一括生成でも数十円
- 次元数 1536 は pgvector で扱いやすい標準的なサイズ
- **モデル名と次元数を DB に記録する**（`embeddingModel` カラム）。将来モデルを変更する際、再埋め込み対象を判別できるようにするため

### Prisma における vector 型の扱い

**Prisma は `vector` 型をネイティブサポートしていない。** 以下の方針で回避する。

- `schema.prisma` では `Unsupported("vector(1536)")` として宣言する（型としては扱えないがマイグレーションは生成できる）
- **埋め込みの読み書き・類似度検索は `$queryRaw` / `$executeRaw` で行う**
- `CREATE EXTENSION IF NOT EXISTS vector;` は初回マイグレーション SQL に手動で追記する

なお本 change では、類似度検索は Python サービス側から psycopg 経由で直接実行するため、Next.js 側で vector を読む必要はない。Next.js は記事 ID の配列を受け取り、既存の Prisma クエリで記事本体を引く。

### 検索フロー

```
[Browser] ── GET /api/search?q=... ──> [Next.js API Route]
                                            │ APIキー付与してプロキシ
                                            ▼
                                   [Lambda / FastAPI]
                                       POST /search
                                            │ ① クエリを埋め込み化（OpenAI）
                                            │ ② pgvector で近傍検索（psycopg）
                                            ▼
                                     記事ID配列を返す
                                            │
[Next.js] ── Prisma で記事本体を取得 ──> 既存 ArticleList で描画
```

Next.js の API Route を挟むのは、**AI サービスの API キーをクライアントに露出させない**ため。

### API 設計

| Method | Path | 場所 | 説明 |
|--------|------|------|------|
| GET | `/api/search?q=&source=&status=` | Next.js | 検索。Python サービスへプロキシし記事を返す |
| POST | `/search` | FastAPI | クエリ文字列 → 記事ID配列 |
| POST | `/embed` | FastAPI | 未埋め込み記事の埋め込みを生成（手動トリガー） |
| GET | `/health` | FastAPI | ヘルスチェック |

### フィルタとの併用

検索結果（記事ID配列）に対し、Next.js 側で既存のフィルタ条件（`source` / `status`）を Prisma クエリで AND 適用する。ベクトル検索側でフィルタを行わないことで、Python サービスの責務を「類似記事を返す」だけに保つ。

### シークレット管理

- OpenAI API キー・DB 接続文字列は **SSM Parameter Store（SecureString）** に格納し、Terraform で管理する
- Lambda は実行時に SSM から取得する
- Next.js 側の `AI_SERVICE_API_KEY` は Vercel 環境変数に設定する

## Risks / Trade-offs

### 【最大のリスク】記事本文が取得できないソースがある

現状の収集はタイトル・タグ等のメタデータ中心であり、**本文がないと埋め込みの品質が頭打ちになる**。ソース別の方針は以下とする。

| ソース | 本文の扱い |
|---|---|
| Qiita | API v2 の `body` を**正規に取得可能**。本文を埋め込み対象にする |
| Zenn | RSS の `description`（要約）まで。全文スクレイピングは規約リスクがあるため**行わない** |
| GitHub Trending | リポジトリ説明文まで |
| Hacker News | 外部リンクのため本文なし。タイトルのみ |

→ 検索品質はソースにより差が出る。**UI に「検索は記事の要約情報に基づく」旨を明示**し、期待値を設計で管理する。

### その他

- **Lambda コールドスタート**: コンテナイメージは初回起動が数秒かかる。依存ライブラリを最小限（`openai`・`psycopg` のみ、`pandas` 等は入れない）にして緩和する。10秒を超える場合はメモリ割り当てを上げて再測定する
- **OpenAI API の課金事故**: 実装ミスによる無限ループを想定し、**OpenAI 側で使用量上限（月$5）を必ず設定する**
- **埋め込みモデル変更時の再生成コスト**: `embeddingModel` カラムで判別可能にしておく。再生成しても数十円
- **Neon のコネクション**: サーバーレスからの接続は **pooled 接続文字列**を使う（direct 接続は Lambda の同時実行で枯渇しうる）

## Migration Plan

1. Neon で `CREATE EXTENSION IF NOT EXISTS vector;` を実行（マイグレーション SQL に含める）
2. `Article` に `embedding` / `bodyText` / `embeddingModel` を追加（すべて nullable = additive）
3. 既存記事に対し `/embed` を手動実行して一括埋め込み（初回のみ、数十円）
4. ロールバック: 追加カラムはすべて nullable のため、AI サービスを停止すれば既存機能は無影響で動作する。検索 UI のみ非表示にすればよい

## Open Questions

- `embedding` を `Article` に直付けするか、`ArticleEmbedding` テーブルに分離するか。Prisma の `Unsupported` 型が既存クエリに影響を与える場合は分離する（実装時に検証）
- Lambda のメモリ割り当ての初期値（512MB で開始し、コールドスタート実測後に調整）
- 類似度の閾値。関連性の低い記事を除外するカットオフ値は実データで調整する
