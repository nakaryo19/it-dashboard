"""FastAPI アプリケーション。Lambda では mangum 経由で実行する。"""

import logging

from fastapi import FastAPI
from mangum import Mangum
from openai import OpenAI
from pydantic import BaseModel, Field

from app import db
from app.config import EMBEDDING_MODEL, get_openai_api_key
from app.embedding import embed_articles

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="it-dashboard ai-service")


class EmbedRequest(BaseModel):
    """1 回の実行で処理する件数の上限。未指定なら未埋め込みの全件。"""

    limit: int | None = Field(default=None, ge=1)


class EmbedResponse(BaseModel):
    total: int
    embedded: int
    failed: int
    model: str


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/embed", response_model=EmbedResponse)
def embed(req: EmbedRequest | None = None) -> EmbedResponse:
    limit = req.limit if req else None
    client = OpenAI(api_key=get_openai_api_key())

    with db.connect() as conn:
        articles = db.fetch_unembedded(conn, limit=limit)
        counts = embed_articles(
            articles,
            client,
            save=lambda rows, model: db.update_embeddings(conn, rows, model),
        )

    return EmbedResponse(**counts, model=EMBEDDING_MODEL)


handler = Mangum(app)
