## ADDED Requirements

### Requirement: 記事取得ボタンがスクレイピングAPIを呼び出す
ページ上の「記事を取得」ボタンをクリックすると、システムは `POST /api/scrape` にリクエストを送信し、レスポンスを受け取るまでローディング状態を表示し、完了後に取得件数を表示しなければならない（SHALL）。

#### Scenario: クリックでローディング表示になる
- **WHEN** ユーザーが「記事を取得」ボタンをクリックする
- **THEN** ボタンが無効化（disabled）され、「取得中...」テキストとスピナーが表示される

#### Scenario: スクレイピング完了後に件数が表示される
- **WHEN** `POST /api/scrape` が `{ success: ["ZENN", "QIITA"], failed: [], count: 10 }` を返す
- **THEN** ボタンが再び有効化され、「10 件取得（ZENN・QIITA）」のような結果テキストが表示される

#### Scenario: スクレイピング失敗時にエラーソースが表示される
- **WHEN** `POST /api/scrape` が `{ success: ["ZENN"], failed: [{ source: "QIITA", error: "timeout" }], count: 5 }` を返す
- **THEN** 失敗したソース名が赤字で表示される
