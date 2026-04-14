## Context

既存の `lib/scrapers/` と `app/api/` は外部 API・DB への依存を持つため、実際の通信なしにテストするにはモックが必要。Next.js App Router の Route Handler はモジュールとして直接呼び出せるため、`next-test-api-route-handler` は不要で標準的な Jest モックで十分。

## Goals / Non-Goals

**Goals:**
- Jest + ts-jest で TypeScript テストをネイティブ実行
- 各スクレイパーは `global.fetch` をモックして HTTP 通信なしで検証
- API Routes は `@/lib/prisma` をモックして DB 接続なしで検証
- 正常系・エラー系（fetch 失敗、404 など）を網羅

**Non-Goals:**
- E2E テスト・統合テスト（実 DB / 実 API への接続）
- React コンポーネントのテスト（UI テストは別途）
- CI パイプラインの設定

## Decisions

### テストランナー: Jest + ts-jest

- **Next.js 組み込みの Vitest や Jest** → `next/jest` 経由の設定も可能だが、App Router の Route Handler を直接ユニットテストする用途では ts-jest のほうがシンプルに設定できる
- **Vitest** → Vite 依存が増える。現プロジェクトは Next.js + Turbopack なので不採用

### fetch モック方法: `jest.spyOn(global, 'fetch')`

- スクレイパーは Node.js 標準の `fetch` を使用。`jest.spyOn(global, 'fetch')` でモックし、`mockResolvedValueOnce` でレスポンスを差し替える
- `whatwg-fetch` や `cross-fetch` のポリフィル導入は不要（Node 18+ で `fetch` はグローバル）

### Prisma モック: `jest.mock('@/lib/prisma')`

- `lib/prisma.ts` が `PrismaClient` シングルトンを export しているため、`jest.mock` でモジュールごと差し替える
- 各テストで `prisma.article.findMany` などを `jest.fn()` に置き換えて戻り値を制御する

### Route Handler のテスト方法

- Next.js の Route Handler は async function をエクスポートするだけの通常モジュール
- `new Request(...)` を渡して直接 `GET(req)` / `POST(req)` / `PATCH(req, ctx)` を呼び出せる
- `RouteContext` の `params` は `Promise<{ id: string }>` なので `{ params: Promise.resolve({ id: '...' }) }` を渡す

### テストファイル配置: `__tests__/` ディレクトリ

- `lib/scrapers/` → `__tests__/scrapers/`
- `app/api/` → `__tests__/api/`
- `jest.config.ts` で `testMatch` を設定し `app/generated/` を除外する

## Risks / Trade-offs

- **Next.js の `server-only` / `next/headers` が Route Handler 内で呼ばれている場合** → 現在の Route Handler は使用していないため問題なし。将来追加した場合は `jest.mock('next/headers')` が必要
- **ts-jest と Next.js の path alias (`@/`)** → `jest.config.ts` の `moduleNameMapper` で解決が必要
- **Prisma 生成コードのパス** → `app/generated/prisma/client` への import も `moduleNameMapper` でマップする
