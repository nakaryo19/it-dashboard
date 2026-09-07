from unittest.mock import MagicMock

import pytest

from app.embedding import build_embedding_text, chunked, embed_articles, embed_texts


class FakeEmbedding:
    def __init__(self, vector):
        self.embedding = vector


def fake_client(vectors_per_call):
    """embeddings.create が呼ばれるたびに vectors_per_call を順に返すクライアント。"""
    client = MagicMock()
    client.embeddings.create.side_effect = [
        MagicMock(data=[FakeEmbedding(v) for v in vectors])
        for vectors in vectors_per_call
    ]
    return client


class TestBuildEmbeddingText:
    def test_タイトルとタグと本文を結合する(self):
        text = build_embedding_text("タイトル", "本文です", ["Python", "AI"])
        assert text == "タイトル\nタグ: Python, AI\n本文です"

    def test_本文がない場合はタイトルとタグだけになる(self):
        assert build_embedding_text("タイトル", None, ["Go"]) == "タイトル\nタグ: Go"

    def test_本文が空白のみなら本文を含めない(self):
        assert build_embedding_text("タイトル", "   \n ", None) == "タイトル"

    def test_タグが空リストなら行を追加しない(self):
        assert build_embedding_text("タイトル", "本文", []) == "タイトル\n本文"

    def test_上限文字数を超えた分は本文から切り詰める(self):
        text = build_embedding_text("T", "あ" * 100, None, max_chars=10)
        assert len(text) == 10
        assert text.startswith("T\n")

    def test_ヘッダーだけで上限を超える場合もはみ出さない(self):
        text = build_embedding_text("タイトル" * 10, "本文", None, max_chars=5)
        assert len(text) == 5


class TestChunked:
    def test_指定件数ずつに分割する(self):
        assert [list(c) for c in chunked([1, 2, 3, 4, 5], 2)] == [[1, 2], [3, 4], [5]]

    def test_空リストは何も生成しない(self):
        assert list(chunked([], 3)) == []


class TestEmbedTexts:
    def test_APIのレスポンスからベクトルを取り出す(self):
        client = fake_client([[[0.1, 0.2]]])
        assert embed_texts(client, ["a"]) == [[0.1, 0.2]]

    def test_失敗してもリトライして成功すれば返す(self, monkeypatch):
        monkeypatch.setattr("app.embedding.time.sleep", lambda _: None)
        client = MagicMock()
        client.embeddings.create.side_effect = [
            RuntimeError("rate limit"),
            MagicMock(data=[FakeEmbedding([0.3])]),
        ]
        assert embed_texts(client, ["a"]) == [[0.3]]
        assert client.embeddings.create.call_count == 2

    def test_リトライ上限を超えたら例外を送出する(self, monkeypatch):
        monkeypatch.setattr("app.embedding.time.sleep", lambda _: None)
        client = MagicMock()
        client.embeddings.create.side_effect = RuntimeError("boom")
        with pytest.raises(RuntimeError):
            embed_texts(client, ["a"])
        assert client.embeddings.create.call_count == 3


class TestEmbedArticles:
    def test_記事IDとベクトルの組を保存する(self):
        articles = [
            {"id": "a1", "title": "T1", "body_text": "B1", "tags": ["x"]},
            {"id": "a2", "title": "T2", "body_text": None, "tags": []},
        ]
        client = fake_client([[[0.1], [0.2]]])
        saved = []

        counts = embed_articles(
            articles,
            client,
            save=lambda rows, model: (saved.extend(rows), len(rows))[1],
        )

        assert counts == {"total": 2, "embedded": 2, "failed": 0}
        assert saved == [("a1", [0.1]), ("a2", [0.2])]

    def test_バッチサイズごとにAPIを呼ぶ(self):
        articles = [
            {"id": f"a{i}", "title": "T", "body_text": None, "tags": []}
            for i in range(5)
        ]
        client = fake_client([[[0.1]] * 2, [[0.1]] * 2, [[0.1]]])

        counts = embed_articles(
            articles, client, save=lambda rows, model: len(rows), batch_size=2
        )

        assert client.embeddings.create.call_count == 3
        assert counts["embedded"] == 5

    def test_失敗したバッチはスキップして残りを処理する(self, monkeypatch):
        monkeypatch.setattr("app.embedding.time.sleep", lambda _: None)
        articles = [
            {"id": f"a{i}", "title": "T", "body_text": None, "tags": []}
            for i in range(4)
        ]
        client = MagicMock()
        client.embeddings.create.side_effect = [
            RuntimeError("boom"),
            RuntimeError("boom"),
            RuntimeError("boom"),
            MagicMock(data=[FakeEmbedding([0.1]), FakeEmbedding([0.2])]),
        ]

        counts = embed_articles(
            articles, client, save=lambda rows, model: len(rows), batch_size=2
        )

        assert counts == {"total": 4, "embedded": 2, "failed": 2}

    def test_対象が0件なら何も呼ばない(self):
        client = MagicMock()
        counts = embed_articles([], client, save=lambda rows, model: len(rows))
        assert counts == {"total": 0, "embedded": 0, "failed": 0}
        client.embeddings.create.assert_not_called()
