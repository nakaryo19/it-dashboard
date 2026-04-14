## Why

スクレイパーと API Routes に自動テストがなく、外部 API の仕様変更やリファクタリング時にリグレッションを検出できない。Jest によるユニットテストを追加し、各モジュールの正常系・異常系を網羅することでコードの信頼性を高める。

## What Changes

- Jest + jest-environment-node のセットアップ（TypeScript 対応含む）
- `lib/scrapers/` 配下の全スクレイパーに対するユニットテスト追加（fetch をモック）
- API Routes (`/api/scrape`・`/api/articles`・`/api/articles/[id]/read`・`/api/articles/[id]/favorite`) に対するユニットテスト追加（Prisma クライアントをモック）

## Capabilities

### New Capabilities

- `scraper-tests`: 各スクレイパー（Zenn・Qiita・GitHub Trending・Hacker News）のユニットテスト。fetch レスポンスをモックして正常系・エラー系を検証する
- `api-route-tests`: API Routes のユニットテスト。Prisma クライアントをモックして HTTP レスポンス・DB 操作を検証する

### Modified Capabilities

## Impact

- **新規依存（devDependencies）**: `jest`・`jest-environment-node`・`ts-jest`・`@types/jest`
- **新規ファイル**: `jest.config.ts`・`__tests__/scrapers/*.test.ts`・`__tests__/api/*.test.ts`
- **既存コードへの変更なし**: テストのみ追加
