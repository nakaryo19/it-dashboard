"""ベクトル検索のコアロジック。

OpenAI 呼び出しと DB アクセスは引数で受け取り、テストからモックできるようにする。
"""

from typing import Callable, Sequence

from app.config import EMBEDDING_MODEL, SEARCH_MIN_SIMILARITY, SEARCH_TOP_K
from app.embedding import embed_texts


def normalize_query(query: str) -> str:
    """検索クエリを正規化する。空白のみは空文字として扱う。"""
    return query.strip()


def search(
    query: str,
    client,
    find: Callable[[list[float], int, float], list[dict]],
    top_k: int = SEARCH_TOP_K,
    min_similarity: float = SEARCH_MIN_SIMILARITY,
    model: str = EMBEDDING_MODEL,
) -> list[dict]:
    """クエリを埋め込み、近傍の記事 ID とスコアを返す。

    空クエリでは OpenAI を呼ばずに空配列を返す（無駄な課金を避ける）。
    """
    normalized = normalize_query(query)
    if not normalized:
        return []

    vectors: Sequence[list[float]] = embed_texts(client, [normalized], model)
    return find(list(vectors[0]), top_k, min_similarity)
