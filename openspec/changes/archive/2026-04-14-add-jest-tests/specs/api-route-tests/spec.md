## ADDED Requirements

### Requirement: POST /api/scrape のユニットテスト
`/api/scrape` の POST ハンドラーは Prisma をモックした環境でテストできなければならない（SHALL）。

#### Scenario: 正常系 - スクレイプ成功時に件数を返す
- **WHEN** scrapeAll がモック記事を返し、prisma.article.upsert が成功する状態で POST リクエストを送る
- **THEN** レスポンスのステータスが 200、JSON に `count`・`success` が含まれる

#### Scenario: 異常系 - scrapeAll が全ソース失敗する
- **WHEN** scrapeAll が全ソース失敗（failed 配列に全ソース）を返す状態で POST リクエストを送る
- **THEN** レスポンスのステータスが 200、`count` が 0、`failed` に失敗ソースが含まれる

### Requirement: GET /api/articles のユニットテスト
`/api/articles` の GET ハンドラーは Prisma をモックした環境でテストできなければならない（SHALL）。

#### Scenario: 正常系 - 全記事を返す
- **WHEN** prisma.article.findMany がモック記事配列を返す状態でクエリパラメータなしの GET リクエストを送る
- **THEN** レスポンスのステータスが 200、モック記事配列が JSON で返る

#### Scenario: source フィルターが DB クエリに反映される
- **WHEN** `?source=ZENN` クエリパラメータ付きで GET リクエストを送る
- **THEN** prisma.article.findMany が `{ where: { sourceType: "ZENN" } }` を含む引数で呼ばれる

#### Scenario: status=unread フィルターが DB クエリに反映される
- **WHEN** `?status=unread` クエリパラメータ付きで GET リクエストを送る
- **THEN** prisma.article.findMany が `{ where: { isRead: false } }` を含む引数で呼ばれる

### Requirement: PATCH /api/articles/[id]/read のユニットテスト
`/api/articles/[id]/read` の PATCH ハンドラーは Prisma をモックした環境でテストできなければならない（SHALL）。

#### Scenario: 正常系 - isRead をトグルできる
- **WHEN** prisma.article.findUnique が `isRead: false` の記事を返す状態で PATCH リクエストを送る
- **THEN** prisma.article.update が `{ data: { isRead: true } }` で呼ばれ、ステータス 200 が返る

#### Scenario: 異常系 - 存在しない id の場合 404 を返す
- **WHEN** prisma.article.findUnique が null を返す状態で PATCH リクエストを送る
- **THEN** レスポンスのステータスが 404

### Requirement: PATCH /api/articles/[id]/favorite のユニットテスト
`/api/articles/[id]/favorite` の PATCH ハンドラーは Prisma をモックした環境でテストできなければならない（SHALL）。

#### Scenario: 正常系 - isFavorite をトグルできる
- **WHEN** prisma.article.findUnique が `isFavorite: false` の記事を返す状態で PATCH リクエストを送る
- **THEN** prisma.article.update が `{ data: { isFavorite: true } }` で呼ばれ、ステータス 200 が返る

#### Scenario: 異常系 - 存在しない id の場合 404 を返す
- **WHEN** prisma.article.findUnique が null を返す状態で PATCH リクエストを送る
- **THEN** レスポンスのステータスが 404
