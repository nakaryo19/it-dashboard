# ai-service

it-dashboard の AI 層（埋め込み生成・ベクトル検索）。Python 3.12 / FastAPI。
本番は AWS Lambda（コンテナイメージ）+ Function URL で動かす。

## セットアップ

```bash
cd ai-service
uv sync
```

環境変数はリポジトリルートの `.env` から読む（`app/config.py`）。

| 変数 | 用途 |
|---|---|
| `DATABASE_URL_POOLED` | Neon の pooled 接続文字列。未設定なら `DATABASE_URL` を使う |
| `OPENAI_API_KEY` | OpenAI Embeddings API |
| `EMBEDDING_MODEL` | 既定 `text-embedding-3-small` |

## 実行

```bash
uv run uvicorn app.main:app --reload --port 8000   # ローカルサーバー
uv run pytest                                       # テスト
```

## エンドポイント

| Method | Path | 説明 |
|---|---|---|
| GET | `/health` | ヘルスチェック |
| POST | `/embed` | `embedding IS NULL` の記事を埋め込む。`{"limit": N}` で件数制限 |

## 埋め込み対象テキスト

`タイトル` + `タグ: ...` + `bodyText` を結合し、先頭 7,000 文字
（`MAX_EMBEDDING_CHARS`）に切り詰める。本文を取得できないソースでは
タイトルとタグのみになる。
