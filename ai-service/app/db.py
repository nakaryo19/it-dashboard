"""Neon PostgreSQL への接続。

Prisma は vector 型を扱えないため、埋め込みの読み書きは psycopg で直接行う。
"""

from contextlib import contextmanager
from typing import Iterator

import psycopg

from app.config import get_database_url


@contextmanager
def connect() -> Iterator[psycopg.Connection]:
    """1 リクエストにつき 1 接続。Lambda では常駐プールを持たない。"""
    with psycopg.connect(get_database_url()) as conn:
        yield conn


def fetch_unembedded(
    conn: psycopg.Connection, limit: int | None = None
) -> list[dict]:
    """埋め込み未生成の記事を取得する。"""
    sql = """
        SELECT id, title, "bodyText", tags
        FROM "Article"
        WHERE embedding IS NULL
        ORDER BY "publishedAt" DESC NULLS LAST
    """
    params: list = []
    if limit is not None:
        sql += " LIMIT %s"
        params.append(limit)

    with conn.cursor() as cur:
        cur.execute(sql, params)
        return [
            {"id": r[0], "title": r[1], "body_text": r[2], "tags": r[3] or []}
            for r in cur.fetchall()
        ]


def update_embeddings(
    conn: psycopg.Connection,
    rows: list[tuple[str, list[float]]],
    model: str,
) -> int:
    """(記事ID, ベクトル) の組を書き込む。

    pgvector のリテラルは "[0.1,0.2,...]" 形式の文字列なので、明示的に
    ::vector へキャストする。
    """
    if not rows:
        return 0

    params = [
        (to_vector_literal(vector), model, article_id)
        for article_id, vector in rows
    ]
    with conn.cursor() as cur:
        cur.executemany(
            'UPDATE "Article" SET embedding = %s::vector, "embeddingModel" = %s'
            " WHERE id = %s",
            params,
        )
    conn.commit()
    return len(params)


def search_similar(
    conn: psycopg.Connection,
    query_vector: list[float],
    top_k: int,
    min_similarity: float,
) -> list[dict]:
    """コサイン距離（<=>）の近い順に記事を返す。

    pgvector の `<=>` は距離（0 が最も近い）なので、類似度は 1 - 距離。
    カットオフは LIMIT より前の WHERE で効かせ、関連する記事だけで上位 N 件を埋める。
    記事数は数千件規模のため、インデックスは作らず逐次スキャンで足りる。
    """
    literal = to_vector_literal(query_vector)
    max_distance = 1.0 - min_similarity

    with conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, 1 - (embedding <=> %(v)s::vector) AS score
            FROM "Article"
            WHERE embedding IS NOT NULL
              AND (embedding <=> %(v)s::vector) <= %(max_distance)s
            ORDER BY embedding <=> %(v)s::vector
            LIMIT %(top_k)s
            """,
            {"v": literal, "max_distance": max_distance, "top_k": top_k},
        )
        return [{"id": r[0], "score": float(r[1])} for r in cur.fetchall()]


def to_vector_literal(vector: list[float]) -> str:
    return "[" + ",".join(repr(float(v)) for v in vector) + "]"
