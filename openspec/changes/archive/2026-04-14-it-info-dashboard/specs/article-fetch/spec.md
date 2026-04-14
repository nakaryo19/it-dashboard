## ADDED Requirements

### Requirement: ユーザーが手動でスクレイピングを実行できる
システムは POST `/api/scrape` リクエストを受け取ったとき、設定済み全ソース（Zenn・Qiita・GitHub Trending・Hacker News）から記事メタデータを取得し、DB に保存または更新（upsert）しなければならない（SHALL）。

#### Scenario: 全ソースのスクレイピング成功
- **WHEN** ユーザーがスクレイプボタンをクリックし POST `/api/scrape` が送信される
- **THEN** 各ソースから記事が取得され、`Article` テーブルに upsert され、取得件数を含む成功レスポンスが返る

#### Scenario: 一部ソースが失敗する
- **WHEN** POST `/api/scrape` が実行され、1つ以上のソースでネットワークエラーが発生する
- **THEN** 失敗したソースはスキップされ、成功したソースの記事は保存され、レスポンスに成功・失敗ソースの内訳が含まれる

#### Scenario: URL 重複記事の取り込み
- **WHEN** 既に DB に存在する URL の記事が再取得される
- **THEN** 既存レコードが更新（upsert）され、重複レコードは作成されない

### Requirement: 各ソースから記事メタデータを取得できる
システムは以下の方法で各ソースから記事を取得しなければならない（SHALL）。
- Zenn: RSS フィード解析
- Qiita: API v2 エンドポイント
- GitHub Trending: HTML スクレイピング
- Hacker News: Firebase REST API

#### Scenario: Zenn RSS フィード取得
- **WHEN** Zenn ソースのスクレイピングが実行される
- **THEN** RSS フィードから最新記事のタイトル・URL・公開日・タグが取得される

#### Scenario: Qiita API 取得
- **WHEN** Qiita ソースのスクレイピングが実行される
- **THEN** Qiita API v2 から最新記事のタイトル・URL・公開日・タグが取得される

#### Scenario: GitHub Trending HTML スクレイピング
- **WHEN** GitHub Trending ソースのスクレイピングが実行される
- **THEN** GitHub Trending ページから当日のリポジトリ名・説明・URL・言語が取得される

#### Scenario: Hacker News API 取得
- **WHEN** Hacker News ソースのスクレイピングが実行される
- **THEN** HN Firebase API から Top Stories の上位記事のタイトル・URL・スコアが取得される
