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


def to_vector_literal(vector: list[float]) -> str:
    return "[" + ",".join(repr(float(v)) for v in vector) + "]"
