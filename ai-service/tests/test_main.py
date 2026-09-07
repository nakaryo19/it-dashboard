from contextlib import contextmanager
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

API_KEY = "test-key"
HEADERS = {"X-API-Key": API_KEY}


@pytest.fixture(autouse=True)
def _api_key(monkeypatch):
    monkeypatch.setenv("AI_SERVICE_API_KEY", API_KEY)


@pytest.fixture
def fake_db(monkeypatch):
    """app.main が使う db モジュールを差し替える。"""
    fake = MagicMock()

    @contextmanager
    def connect():
        yield MagicMock()

    fake.connect = connect
    monkeypatch.setattr("app.main.db", fake)
    monkeypatch.setattr("app.main.OpenAI", lambda api_key: MagicMock())
    monkeypatch.setenv("OPENAI_API_KEY", "sk-test")
    return fake


class TestHealth:
    def test_認証なしでokを返す(self):
        res = client.get("/health")
        assert res.status_code == 200
        assert res.json() == {"status": "ok"}


class TestAuth:
    def test_APIキーが無ければ401(self):
        res = client.post("/search", json={"query": "test"})
        assert res.status_code == 401

    def test_APIキーが違えば401(self):
        res = client.post(
            "/search", json={"query": "test"}, headers={"X-API-Key": "wrong"}
        )
        assert res.status_code == 401

    def test_サーバー側にキーが無ければ500(self, monkeypatch):
        monkeypatch.delenv("AI_SERVICE_API_KEY", raising=False)
        # .env からのフォールバックも塞ぐ
        monkeypatch.setattr("app.config._load_dotenv", lambda: None)
        res = client.post("/search", json={"query": "test"}, headers=HEADERS)
        assert res.status_code == 500


class TestSearch:
    def test_近傍検索の結果をスコア付きで返す(self, fake_db, monkeypatch):
        monkeypatch.setattr(
            "app.main.run_search",
            lambda *a, **k: [{"id": "a1", "score": 0.82}],
        )

        res = client.post("/search", json={"query": "Rust 非同期"}, headers=HEADERS)

        assert res.status_code == 200
        assert res.json() == {
            "query": "Rust 非同期",
            "hits": [{"id": "a1", "score": 0.82}],
        }

    def test_空クエリはDBもOpenAIも呼ばずに空配列を返す(self, fake_db):
        res = client.post("/search", json={"query": "   "}, headers=HEADERS)
        assert res.status_code == 200
        assert res.json()["hits"] == []
        fake_db.search_similar.assert_not_called()

    def test_top_kの上限を超えると422(self, fake_db):
        res = client.post(
            "/search", json={"query": "a", "top_k": 1000}, headers=HEADERS
        )
        assert res.status_code == 422
