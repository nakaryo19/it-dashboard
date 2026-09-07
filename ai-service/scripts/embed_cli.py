"""未埋め込み記事を一括で埋め込むローカル実行用スクリプト。

Lambda をデプロイする前の初回一括生成（tasks 3.7）や、手動での追い埋めに使う。

    uv run python scripts/embed_cli.py [--limit N] [--dry-run]

--dry-run は OpenAI を呼ばず、対象件数と先頭の埋め込みテキストだけを表示する。
"""

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from openai import OpenAI  # noqa: E402

from app import db  # noqa: E402
from app.config import EMBEDDING_MODEL, get_openai_api_key  # noqa: E402
from app.embedding import build_embedding_text, embed_articles  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    with db.connect() as conn:
        articles = db.fetch_unembedded(conn, limit=args.limit)
        print(f"対象 {len(articles)} 件 / モデル {EMBEDDING_MODEL}")

        if args.dry_run:
            for a in articles[:3]:
                text = build_embedding_text(a["title"], a["body_text"], a["tags"])
                print(f"--- {a['id']} ({len(text)} 文字)")
                print(text[:200])
            return

        if not articles:
            return

        counts = embed_articles(
            articles,
            OpenAI(api_key=get_openai_api_key()),
            save=lambda rows, model: db.update_embeddings(conn, rows, model),
        )
        print("完了:", counts)


if __name__ == "__main__":
    main()
