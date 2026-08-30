## MODIFIED Requirements

### Requirement: 各ソースから記事メタデータを取得できる
システムは以下の方法で各ソースから記事を取得しなければならない（SHALL）。
- Zenn: RSS フィード解析
- Qiita: API v2 エンドポイント
- GitHub Trending: HTML スクレイピング
- Hacker News: Firebase REST API

**変更点**: Qiita については、記事メタデータに加えて **API v2 が返す記事本文（`body`）を取得し、`Article.bodyText` に保存する**。他ソースについては、規約上取得が許容される範囲（RSS の要約・リポジトリ説明文）に留め、本文の全文スクレイピングは行わない（SHALL NOT）。

#### Scenario: Zenn RSS フィード取得
- **WHEN** Zenn ソースのスクレイピングが実行される
- **THEN** RSS フィードから最新記事のタイトル・URL・公開日・タグが取得される

#### Scenario: Qiita API 取得（本文を含む）
- **WHEN** Qiita ソースのスクレイピングが実行される
- **THEN** Qiita API v2 から最新記事のタイトル・URL・公開日・タグに加えて記事本文が取得され、`bodyText` に保存される

#### Scenario: GitHub Trending HTML スクレイピング
- **WHEN** GitHub Trending ソースのスクレイピングが実行される
- **THEN** GitHub Trending ページから当日のリポジトリ名・説明・URL・言語が取得される

#### Scenario: Hacker News API 取得
- **WHEN** HN Firebase API から Top Stories の上位記事が取得される
- **THEN** タイトル・URL・スコアが保存され、`bodyText` は NULL のままとなる

#### Scenario: 本文取得に失敗しても記事保存は継続する
- **WHEN** Qiita 記事の本文が空、または想定外の形式で返される
- **THEN** `bodyText` は NULL として保存され、記事メタデータの保存は正常に完了する
