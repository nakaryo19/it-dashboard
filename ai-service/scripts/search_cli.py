"""ローカルから検索を試すスクリプト。閾値の調整（tasks 4.2 / 4.6）にも使う。

    uv run python scripts/search_cli.py "Rustの非同期処理でつまずくところ" [--top-k 10] [--min-similarity 0.0]
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from openai import OpenAI  # noqa: E402

from app import db  # noqa: E402
from app.config import (  # noqa: E402
    SEARCH_MIN_SIMILARITY,
    SEARCH_TOP_K,
    get_openai_api_key,
)
from app.search import search  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("query")
    parser.add_argument("--top-k", type=int, default=SEARCH_TOP_K)
    parser.add_argument("--min-similarity", type=float, default=SEARCH_MIN_SIMILARITY)
    args = parser.parse_args()

    with db.connect() as conn:
        hits = search(
            args.query,
            OpenAI(api_key=get_openai_api_key()),
            find=lambda v, k, m: db.search_similar(conn, v, k, m),
            top_k=args.top_k,
            min_similarity=args.min_similarity,
        )

        if not hits:
            print("該当なし")
            return

        # 目視確認のためタイトルを引く（本番の検索 API は ID だけを返す）
        ids = [h["id"] for h in hits]
        with conn.cursor() as cur:
            cur.execute(
                'SELECT id, "sourceType", title FROM "Article" WHERE id = ANY(%s)',
                (ids,),
            )
            meta = {r[0]: (r[1], r[2]) for r in cur.fetchall()}

    for h in hits:
        source, title = meta.get(h["id"], ("?", "?"))
        print(f"{h['score']:.3f}  [{source}] {title}")


if __name__ == "__main__":
    main()
