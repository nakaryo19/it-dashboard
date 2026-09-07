from app.db import to_vector_literal


class TestToVectorLiteral:
    def test_pgvectorのリテラル形式にする(self):
        assert to_vector_literal([0.1, -0.2, 3.0]) == "[0.1,-0.2,3.0]"

    def test_intもfloatとして出力する(self):
        assert to_vector_literal([1, 2]) == "[1.0,2.0]"
