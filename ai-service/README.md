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
| `AI_SERVICE_API_KEY` | Next.js からの呼び出しを認証する共有キー。**未設定だと `/embed` `/search` は 500** |
| `ALLOWED_ORIGINS` | CORS 許可オリジン（カンマ区切り）。既定 `http://localhost:3000`、本番は Vercel のドメイン |
| `SEARCH_TOP_K` | 検索の既定件数（既定 20） |
| `SEARCH_MIN_SIMILARITY` | 類似度カットオフ（既定 0.30） |

## 実行

```bash
uv run uvicorn app.main:app --reload --port 8000   # ローカルサーバー
uv run pytest                                       # テスト

uv run python scripts/embed_cli.py --dry-run        # 埋め込み対象の確認
uv run python scripts/search_cli.py "検索したい内容" # 検索の目視確認
```

## エンドポイント

| Method | Path | 認証 | 説明 |
|---|---|---|---|
| GET | `/health` | 不要 | ヘルスチェック（Lambda の疎通確認用） |
| POST | `/embed` | 要 | `embedding IS NULL` の記事を埋め込む。`{"limit": N}` で件数制限 |
| POST | `/search` | 要 | `{"query": "...", "top_k": 20, "min_similarity": 0.3}` → 記事 ID とスコア |

認証は `X-API-Key` ヘッダー。Lambda Function URL は認証なしで公開されるため、
アプリ側で共有キーを検証する（キー未設定なら素通しさせずに 500 を返す）。

## 類似度のカットオフ

実データ 282 件での計測結果:

| クエリ | 最高スコア |
|---|---|
| 「犬の散歩コース」（無関係） | 0.282 |
| 「今晩の献立に合う味噌汁の具材」（無関係） | 0.270 |
| 「Rustの非同期処理でつまずくところ」 | 0.536 |
| 「型安全にAPIのレスポンスを扱いたい」 | 0.511 |
| 「LLMのコストを下げる工夫」 | 0.342 |

無関係なクエリのノイズ帯が 0.28 前後まで達するため、その直上の **0.30** を既定値とした。

## 埋め込み対象テキスト

`タイトル` + `タグ: ...` + `bodyText` を結合し、先頭 7,000 文字
（`MAX_EMBEDDING_CHARS`）に切り詰める。本文を取得できないソースでは
タイトルとタグのみになる。
