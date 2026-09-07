"""埋め込み生成のコアロジック。

OpenAI 呼び出しと DB 更新は引数で受け取り、テストからモックできるようにする。
"""

import logging
import time
from typing import Callable, Iterator, Sequence

from app.config import (
    EMBED_BATCH_SIZE,
    EMBEDDING_MODEL,
    MAX_EMBEDDING_CHARS,
)

logger = logging.getLogger(__name__)

# API エラー時のリトライ回数と待機秒数（指数バックオフ）。
MAX_RETRIES = 3
RETRY_BASE_SECONDS = 2.0


def build_embedding_text(
    title: str,
    body_text: str | None,
    tags: Sequence[str] | None = None,
    max_chars: int = MAX_EMBEDDING_CHARS,
) -> str:
    """タイトル・タグ・本文を結合し、先頭 max_chars 文字に切り詰める。

    タイトルとタグは短く情報密度が高いため必ず残し、溢れた分は本文から削る。
    本文が無いソース（Zenn / Hacker News など）ではタイトルとタグだけになる。
    """
    header_lines = [title.strip()]
    if tags:
        cleaned = [t.strip() for t in tags if t and t.strip()]
        if cleaned:
            header_lines.append("タグ: " + ", ".join(cleaned))

    header = "\n".join(header_lines)
    if body_text is None or not body_text.strip():
        return header[:max_chars]

    remaining = max_chars - len(header) - 1  # 改行 1 文字分
    if remaining <= 0:
        return header[:max_chars]

    return header + "\n" + body_text.strip()[:remaining]


def chunked(items: Sequence, size: int) -> Iterator[Sequence]:
    for i in range(0, len(items), size):
        yield items[i : i + size]


def embed_texts(client, texts: Sequence[str], model: str = EMBEDDING_MODEL) -> list[list[float]]:
    """OpenAI Embeddings API を呼ぶ。レート制限・一時障害はリトライする。"""
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            res = client.embeddings.create(model=model, input=list(texts))
            return [d.embedding for d in res.data]
        except Exception as err:  # noqa: BLE001 - SDK の例外型に依存しない
            last_error = err
            wait = RETRY_BASE_SECONDS * (2**attempt)
            logger.warning(
                "embeddings.create に失敗 (%d/%d): %s / %.1fs 後に再試行",
                attempt + 1,
                MAX_RETRIES,
                err,
                wait,
            )
            if attempt < MAX_RETRIES - 1:
                time.sleep(wait)
    assert last_error is not None
    raise last_error


def embed_articles(
    articles: Sequence[dict],
    client,
    save: Callable[[list[tuple[str, list[float]]], str], int],
    model: str = EMBEDDING_MODEL,
    batch_size: int = EMBED_BATCH_SIZE,
) -> dict[str, int]:
    """記事のリストをバッチで埋め込み、save で永続化する。

    1 バッチが失敗しても残りのバッチは処理を続け、失敗件数を返す。
    """
    counts = {"total": len(articles), "embedded": 0, "failed": 0}

    for batch in chunked(list(articles), batch_size):
        texts = [
            build_embedding_text(a["title"], a.get("body_text"), a.get("tags"))
            for a in batch
        ]
        try:
            vectors = embed_texts(client, texts, model)
        except Exception as err:  # noqa: BLE001
            # このバッチは諦め、次のバッチへ進む（次回実行で再試行される）
            counts["failed"] += len(batch)
            logger.error("バッチの埋め込みに失敗しスキップします: %s", err)
            continue

        counts["embedded"] += save(
            [(a["id"], v) for a, v in zip(batch, vectors)], model
        )

    return counts
