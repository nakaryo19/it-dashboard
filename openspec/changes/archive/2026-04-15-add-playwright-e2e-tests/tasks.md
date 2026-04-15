## 1. コンポーネントへの data-testid 追加

- [x] 1.1 `ScrapeButton.tsx` の「記事を取得」ボタンに `data-testid="scrape-button"` を追加する
- [x] 1.2 `ScrapeButton.tsx` の結果表示テキストに `data-testid="scrape-result"` を追加する
- [x] 1.3 `FilterBar.tsx` の各ソースフィルターボタンに `data-testid="source-filter-{value}"` を追加する（例: `data-testid="source-filter-ZENN"`、`data-testid="source-filter-"` はすべて）
- [x] 1.4 `FilterBar.tsx` の各状態フィルターボタンに `data-testid="status-filter-{value}"` を追加する
- [x] 1.5 `ArticleCard.tsx` のカードルート要素に `data-testid="article-card"` を追加する
- [x] 1.6 `ArticleCard.tsx` のタイトルリンクに `data-testid="article-title"` を追加する
- [x] 1.7 `ArticleCard.tsx` の状態ボタン（既読/未読）に `data-testid="read-toggle"` を追加する

## 2. E2E テストファイルの作成

- [x] 2.1 `e2e/` ディレクトリを作成する
- [x] 2.2 `e2e/dashboard.spec.ts` を作成し、テストファイルの基本構造（import・describe ブロック）を記述する

## 3. スクレイプボタンのテスト実装

- [x] 3.1 `POST /api/scrape` を `page.route()` でモックするヘルパーを実装する
- [x] 3.2 「クリックでローディング表示になる」シナリオのテストを実装する（`data-testid="scrape-button"` が disabled になることを検証）
- [x] 3.3 「スクレイピング完了後に件数が表示される」シナリオのテストを実装する（`data-testid="scrape-result"` に件数テキストが表示されることを検証）
- [x] 3.4 「スクレイピング失敗時にエラーソースが表示される」シナリオのテストを実装する

## 4. フィルターのテスト実装

- [x] 4.1 「ソースフィルタークリックでURLが更新される」シナリオのテストを実装する（`page.url()` に `source=ZENN` が含まれることを検証）
- [x] 4.2 「アクティブなソースフィルターのスタイルが変わる」シナリオのテストを実装する
- [x] 4.3 「『すべて』をクリックするとソースフィルターが解除される」シナリオのテストを実装する
- [x] 4.4 「状態フィルター『未読』クリックでURLが更新される」シナリオのテストを実装する
- [x] 4.5 「状態フィルター『既読』クリックでURLが更新される」シナリオのテストを実装する
- [x] 4.6 「状態フィルター『お気に入り』クリックでURLが更新される」シナリオのテストを実装する
- [x] 4.7 「ソースと状態フィルターを同時に選択できる」シナリオのテストを実装する

## 5. 既読切替のテスト実装

- [x] 5.1 テスト用モック記事データ（未読状態）を定義する
- [x] 5.2 `PATCH /api/articles/*/read` を `page.route()` でモックするヘルパーを実装する
- [x] 5.3 「タイトルクリック直後に楽観的更新でカードが既読スタイルになる」シナリオのテストを実装する（カード背景色・タイトル文字色の変化を検証）
- [x] 5.4 「タイトルクリックで状態ボタンが『既読』表示になる」シナリオのテストを実装する（`data-testid="read-toggle"` のテキスト変化を検証）
- [x] 5.5 「APIが失敗した場合は楽観的更新が取り消される」シナリオのテストを実装する（500エラー時のロールバックを検証）
- [x] 5.6 「既読記事のタイトルをクリックしてもAPIが呼ばれない」シナリオのテストを実装する（リクエスト発生なしを検証）

## 6. 動作確認

- [x] 6.1 `npm run test:e2e` を実行してすべてのテストがパスすることを確認する
- [x] 6.2 `npm run test:e2e:report` でHTMLレポートを確認する
