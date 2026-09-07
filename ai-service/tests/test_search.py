from unittest.mock import MagicMock

from app.search import normalize_query, search


class FakeEmbedding:
    def __init__(self, vector):
        self.embedding = vector


def fake_client(vector):
    client = MagicMock()
    client.embeddings.create.return_value = MagicMock(data=[FakeEmbedding(vector)])
    return client


class TestNormalizeQuery:
    def test_前後の空白を落とす(self):
        assert normalize_query("  Rust 非同期  ") == "Rust 非同期"

    def test_空白のみは空文字になる(self):
        assert normalize_query("   \n\t ") == ""


class TestSearch:
    def test_クエリを埋め込んで近傍検索の結果を返す(self):
        client = fake_client([0.1, 0.2])
        captured = {}

        def find(vector, top_k, min_similarity):
            captured.update(
                vector=vector, top_k=top_k, min_similarity=min_similarity
            )
            return [{"id": "a1", "score": 0.8}, {"id": "a2", "score": 0.5}]

        hits = search("Rust の非同期", client, find, top_k=5, min_similarity=0.3)

        assert hits == [{"id": "a1", "score": 0.8}, {"id": "a2", "score": 0.5}]
        assert captured == {
            "vector": [0.1, 0.2],
            "top_k": 5,
            "min_similarity": 0.3,
        }

    def test_埋め込みには正規化後のクエリを渡す(self):
        client = fake_client([0.1])
        search("  Go の並行処理  ", client, lambda *_: [])
        assert client.embeddings.create.call_args.kwargs["input"] == ["Go の並行処理"]

    def test_空クエリではOpenAIを呼ばず空配列を返す(self):
        client = MagicMock()
        called = []

        assert search("   ", client, lambda *a: called.append(a) or []) == []
        client.embeddings.create.assert_not_called()
        assert called == []

    def test_該当なしなら空配列を返す(self):
        client = fake_client([0.1])
        assert search("無関係な語", client, lambda *_: []) == []
