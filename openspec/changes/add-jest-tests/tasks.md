## 1. Jest セットアップ

- [x] 1.1 `jest`・`ts-jest`・`@types/jest`・`jest-environment-node` を devDependencies にインストールする
- [x] 1.2 `jest.config.ts` を作成し、ts-jest・moduleNameMapper（`@/` エイリアス）・testEnvironment・testMatch を設定する
- [x] 1.3 `package.json` に `"test": "jest"` スクリプトを追加する
- [x] 1.4 `npx jest --listTests` でテストファイルが認識されることを確認する

## 2. スクレイパーテスト

- [x] 2.1 `__tests__/scrapers/zenn.test.ts` を作成し、正常系（RSS XML パース）・異常系（fetch エラー）を実装する
- [x] 2.2 `__tests__/scrapers/qiita.test.ts` を作成し、正常系（API JSON パース）・異常系（HTTP エラー）を実装する
- [x] 2.3 `__tests__/scrapers/github-trending.test.ts` を作成し、正常系（HTML パース・owner/repo 形式）・異常系を実装する
- [x] 2.4 `__tests__/scrapers/hacker-news.test.ts` を作成し、正常系・url なし記事の除外・異常系を実装する

## 3. API Route テスト

- [x] 3.1 `__tests__/api/scrape.test.ts` を作成し、`lib/scrapers` と `lib/prisma` をモックして POST ハンドラーの正常系・全失敗系を実装する
- [x] 3.2 `__tests__/api/articles.test.ts` を作成し、`lib/prisma` をモックして GET ハンドラーの全件取得・source フィルター・status フィルターを実装する
- [x] 3.3 `__tests__/api/articles-read.test.ts` を作成し、PATCH ハンドラーの isRead トグル正常系・404 異常系を実装する
- [x] 3.4 `__tests__/api/articles-favorite.test.ts` を作成し、PATCH ハンドラーの isFavorite トグル正常系・404 異常系を実装する

## 4. テスト実行・確認

- [x] 4.1 `npm test` で全テストがパスすることを確認する
- [x] 4.2 カバレッジレポートを確認し、各スクレイパー・Route Handler の主要パスが網羅されていることを確認する（`npx jest --coverage`）
