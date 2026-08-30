<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# プロジェクト概要

**it-dashboard** は Zenn・Qiita・GitHub Trending・Hacker News の記事を一元管理する情報収集ダッシュボード。

- 開発は **openspec による仕様駆動**で進める。実装前に `openspec/changes/<change>/` の proposal・design・tasks・specs を確認すること。仕様判断に迷ったら該当 change のドキュメントを正本とする。
- 実装完了した change は `openspec/changes/archive/` に移動し、`openspec/specs/` を更新する。

## 開発フェーズ

AI 層は3段階で追加する。**フェーズを先取りしないこと。**

1. **Phase A（現在着手中）**: セマンティック検索。埋め込み生成 + pgvector 検索 + Python サービスの AWS 構築まで。生成 AI（LLM）呼び出しは含めない。
2. **Phase B（PhaseA運用後に検討）**: 出典付き RAG チャット、およびコストログ・上限ガードレール。
3. **Phase C（任意）**: 記事取得の自動化と日次 AI ダイジェスト。着手判断は Phase B 完了時に行う。

## 制約（重要）

- **運用コストは月1,000円以内。** Phase A は月100円以内。新しい AWS リソースやマネージドサービスを追加する際は、必ず無料枠・従量課金を確認すること。
- **NAT Gateway を作らない。** 月約4,500円が発生し予算が破綻する。Neon はパブリックエンドポイントのため **Lambda を VPC に配置する必要はない**。
- **常駐サービスを使わない。** Fargate 常駐等は不採用。実行基盤は Lambda（コンテナイメージ）+ Function URL とする。
- **API Gateway を使わない。** Lambda Function URL で足りる。
- **CloudWatch Logs の保持期間は必ず設定する**（7日）。デフォルトの無期限はコスト要因になる。
- **OpenAI の使用量上限を設定した状態で開発する。** 実装ミスによる課金事故を防ぐ。
- **記事本文の全文スクレイピングを行わない。** 本文取得は Qiita API v2 の `body` など、規約上許容される範囲に限定する。Zenn は RSS の要約まで。

## アーキテクチャ

```
[Vercel] Next.js 16 (App Router) ──> [AWS] Lambda Function URL ──> FastAPI (Python 3.12)
    │                                                                    │
    └────────── Prisma ──────────> [Neon PostgreSQL + pgvector] <── psycopg
```

- AI 処理（埋め込み生成・ベクトル検索）は `ai-service/`（Python / FastAPI）に分離する。既存の TypeScript コードベースに AI ロジックを混ぜない。
- インフラは `infra/`（Terraform）で管理する。手動でリソースを作らない。
- **AI サービスの API キーをクライアントに露出させない。** ブラウザからは必ず Next.js の API Route を経由させる。

## Prisma と pgvector

**Prisma は `vector` 型をネイティブサポートしていない。**

- `schema.prisma` では `Unsupported("vector(1536)")` として宣言する
- 埋め込みの読み書き・類似度検索は `$queryRaw` / `$executeRaw`、または Python サービス側の psycopg で行う
- `CREATE EXTENSION IF NOT EXISTS vector;` はマイグレーション SQL に手動で追記する
- 埋め込みモデルを変更する際は再埋め込みが必要なため、`embeddingModel` カラムに使用モデル名を必ず記録する

## よく使うコマンド

```bash
npm run dev            # 開発サーバー起動
npm run build          # 本番ビルド（prisma generate を含む）
npm run lint           # ESLint
npm test               # Jest（ユニットテスト）
npm run test:coverage  # カバレッジ付きテスト
npm run test:e2e       # Playwright（E2E）
```

## コーディング規約

- コミット前に `npm run lint` と `npm test` を通すこと。
- ユニットテストは Jest + ts-jest、E2E は Playwright。テストは `__tests__/` および `e2e/` に配置する。
- Python サービスのテストは pytest。OpenAI API 呼び出しはモックすること（実 API をテストから叩かない）。
- Lambda のコンテナイメージを肥大化させないため、`ai-service/` に重量級ライブラリ（pandas 等）を追加しない。
