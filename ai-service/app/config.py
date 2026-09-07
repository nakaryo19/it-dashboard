"""環境変数の読み取り。

本番では Lambda の環境変数（値は SSM Parameter Store 由来）を、
ローカルではリポジトリルートの .env を読む。
"""

import os
from pathlib import Path

# 埋め込みモデル。変更時は再埋め込みが必要なため DB の embeddingModel に記録する。
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")
EMBEDDING_DIMENSIONS = 1536

# 埋め込み対象テキストの最大文字数（タイトル＋タグ＋本文の合計）。
# 実データの中央値は約 4,000 文字、平均 6,871 文字。8,191 トークンの入力上限に
# 対して十分な余裕を持たせつつ、大半の記事が全文入る値として 7,000 を採る。
MAX_EMBEDDING_CHARS = int(os.getenv("MAX_EMBEDDING_CHARS", "7000"))

# OpenAI Embeddings API は 1 リクエストに複数入力を渡せる。
EMBED_BATCH_SIZE = int(os.getenv("EMBED_BATCH_SIZE", "100"))

# 検索で返す記事の既定件数。リクエストの top_k で上書きできる。
SEARCH_TOP_K = int(os.getenv("SEARCH_TOP_K", "20"))
SEARCH_MAX_TOP_K = 100

# コサイン類似度のカットオフ。これ未満の記事は関連性が低いとみなして除外する。
# 実データ 282 件での計測（tasks 4.6）:
#   - 無関係なクエリ（「犬の散歩コース」等）の最高スコアは 0.28 前後
#   - 関連するクエリの妥当な結果は 0.31〜0.51
# ノイズ帯の直上として 0.30 を既定値とする。
SEARCH_MIN_SIMILARITY = float(os.getenv("SEARCH_MIN_SIMILARITY", "0.30"))

# ブラウザから直接叩かせないため、本番は Vercel のドメインのみ許可する。
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]


def _load_dotenv() -> None:
    """ローカル実行用に、リポジトリルートの .env を最小限パースする。

    python-dotenv を依存に加えないのは、Lambda イメージを小さく保つため。
    既に設定済みの環境変数は上書きしない。
    """
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def get_database_url() -> str:
    """Neon の接続文字列。Lambda の同時実行に備え pooled 接続を優先する。"""
    _load_dotenv()
    url = os.getenv("DATABASE_URL_POOLED") or os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL_POOLED / DATABASE_URL が未設定です")
    return url


def get_openai_api_key() -> str:
    _load_dotenv()
    key = os.getenv("OPENAI_API_KEY")
    if not key:
        raise RuntimeError("OPENAI_API_KEY が未設定です")
    return key


def get_service_api_key() -> str:
    """Next.js の API Route からの呼び出しを認証するための共有キー。

    未設定のまま公開すると誰でも OpenAI の課金を発生させられるため、
    フェイルクローズ（未設定なら例外）とする。
    """
    _load_dotenv()
    key = os.getenv("AI_SERVICE_API_KEY")
    if not key:
        raise RuntimeError("AI_SERVICE_API_KEY が未設定です")
    return key
