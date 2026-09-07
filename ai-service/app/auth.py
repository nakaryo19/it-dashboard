"""API キーによる簡易認証。

Lambda Function URL は認証なしで公開されるため、アプリ側で共有キーを検証する。
呼び出し元は Next.js の API Route のみを想定しており、キーはブラウザに渡さない。
"""

import hmac

from fastapi import Header, HTTPException, status

from app.config import get_service_api_key

API_KEY_HEADER = "X-API-Key"


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    """FastAPI の依存として使う。一致しなければ 401 を返す。"""
    try:
        expected = get_service_api_key()
    except RuntimeError as err:
        # キー未設定のまま素通しにはしない
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(err)
        ) from err

    # タイミング攻撃を避けるため定数時間で比較する
    if x_api_key is None or not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid api key"
        )
