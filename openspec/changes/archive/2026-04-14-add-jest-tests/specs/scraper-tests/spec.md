## ADDED Requirements

### Requirement: Zenn スクレイパーのユニットテスト
`scrapeZenn` 関数は fetch をモックした環境でテストできなければならない（SHALL）。

#### Scenario: 正常系 - RSS フィードから記事をパースできる
- **WHEN** Zenn RSS フィードの XML レスポンスをモックして `scrapeZenn()` を呼び出す
- **THEN** `ScrapedArticle[]` が返り、`sourceType` が `"ZENN"`、title・url・publishedAt・tags が正しくパースされている

#### Scenario: 異常系 - fetch が HTTP エラーを返す
- **WHEN** fetch が 500 ステータスを返すようモックして `scrapeZenn()` を呼び出す
- **THEN** エラーがスローされる

### Requirement: Qiita スクレイパーのユニットテスト
`scrapeQiita` 関数は fetch をモックした環境でテストできなければならない（SHALL）。

#### Scenario: 正常系 - API レスポンスから記事をパースできる
- **WHEN** Qiita API v2 の JSON レスポンスをモックして `scrapeQiita()` を呼び出す
- **THEN** `ScrapedArticle[]` が返り、`sourceType` が `"QIITA"`、title・url・publishedAt・tags が正しくマッピングされている

#### Scenario: 異常系 - fetch が失敗する
- **WHEN** fetch が 429 ステータスを返すようモックして `scrapeQiita()` を呼び出す
- **THEN** エラーがスローされる

### Requirement: GitHub Trending スクレイパーのユニットテスト
`scrapeGitHubTrending` 関数は fetch をモックした環境でテストできなければならない（SHALL）。

#### Scenario: 正常系 - HTML からリポジトリ情報をパースできる
- **WHEN** GitHub Trending の HTML をモックして `scrapeGitHubTrending()` を呼び出す
- **THEN** `ScrapedArticle[]` が返り、`sourceType` が `"GITHUB_TRENDING"`、title が `owner/repo` 形式、url が `https://github.com/owner/repo` になっている

#### Scenario: 異常系 - fetch が失敗する
- **WHEN** fetch が 503 ステータスを返すようモックして `scrapeGitHubTrending()` を呼び出す
- **THEN** エラーがスローされる

### Requirement: Hacker News スクレイパーのユニットテスト
`scrapeHackerNews` 関数は fetch をモックした環境でテストできなければならない（SHALL）。

#### Scenario: 正常系 - Firebase API からストーリーをパースできる
- **WHEN** HN topstories と item エンドポイントのレスポンスをモックして `scrapeHackerNews()` を呼び出す
- **THEN** `ScrapedArticle[]` が返り、`sourceType` が `"HACKER_NEWS"`、title・url・publishedAt が正しくマッピングされている

#### Scenario: url を持たないストーリーは除外される
- **WHEN** `url` フィールドを持たない HN アイテム（Ask HN 等）が含まれるレスポンスをモックする
- **THEN** 返される配列にその記事は含まれない

#### Scenario: 異常系 - topstories 取得が失敗する
- **WHEN** topstories エンドポイントが 500 ステータスを返すようモックする
- **THEN** エラーがスローされる
