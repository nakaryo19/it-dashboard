"""FastAPI アプリケーション。Lambda では mangum 経由で実行する。"""

import logging

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from openai import OpenAI
from pydantic import BaseModel, Field

from app import db
from app.auth import API_KEY_HEADER, require_api_key
from app.config import (
    ALLOWED_ORIGINS,
    EMBEDDING_MODEL,
    SEARCH_MAX_TOP_K,
    SEARCH_MIN_SIMILARITY,
    SEARCH_TOP_K,
    get_openai_api_key,
)
from app.embedding import embed_articles
from app.search import normalize_query
from app.search import search as run_search

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="it-dashboard ai-service")

# ブラウザからは Next.js の API Route 経由でのみ呼ばせる。
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=[API_KEY_HEADER, "Content-Type"],
)


class EmbedRequest(BaseModel):
    """1 回の実行で処理する件数の上限。未指定なら未埋め込みの全件。"""

    limit: int | None = Field(default=None, ge=1)


class EmbedResponse(BaseModel):
    total: int
    embedded: int
    failed: int
    model: str


class SearchRequest(BaseModel):
    query: str
    top_k: int = Field(default=SEARCH_TOP_K, ge=1, le=SEARCH_MAX_TOP_K)
    min_similarity: float = Field(default=SEARCH_MIN_SIMILARITY, ge=0.0, le=1.0)


class SearchHit(BaseModel):
    id: str
    score: float


class SearchResponse(BaseModel):
    query: str
    hits: list[SearchHit]


@app.get("/health")
def health() -> dict[str, str]:
    """Lambda の疎通確認に使うため認証不要。DB や OpenAI には触れない。"""
    return {"status": "ok"}


@app.post(
    "/embed", response_model=EmbedResponse, dependencies=[Depends(require_api_key)]
)
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


@app.post(
    "/search", response_model=SearchResponse, dependencies=[Depends(require_api_key)]
)
def search(req: SearchRequest) -> SearchResponse:
    # 空クエリは OpenAI も DB も呼ばずに返す
    if not normalize_query(req.query):
        return SearchResponse(query=req.query, hits=[])

    client = OpenAI(api_key=get_openai_api_key())

    with db.connect() as conn:
        hits = run_search(
            req.query,
            client,
            find=lambda vector, top_k, min_similarity: db.search_similar(
                conn, vector, top_k, min_similarity
            ),
            top_k=req.top_k,
            min_similarity=req.min_similarity,
        )

    return SearchResponse(query=req.query, hits=[SearchHit(**h) for h in hits])


handler = Mangum(app)
