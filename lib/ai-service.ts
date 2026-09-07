/**
 * ai-service（Lambda / FastAPI）への呼び出し。
 *
 * このモジュールはサーバー側でのみ使う。AI_SERVICE_API_KEY をクライアントに
 * 渡さないため、ブラウザからは必ず Next.js の API Route / Server Component を経由させる。
 */

export interface SearchHit {
  id: string;
  score: number;
}

/** AI サービス起因の失敗。呼び出し側で握りつぶして既存機能を維持するために使う。 */
export class AiServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiServiceError";
  }
}

/** AI サービスが落ちても記事一覧の表示を止めないよう、短めに切る。 */
const TIMEOUT_MS = 10_000;

export async function searchArticleIds(query: string): Promise<SearchHit[]> {
  const baseUrl = process.env.AI_SERVICE_URL;
  const apiKey = process.env.AI_SERVICE_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new AiServiceError("AI_SERVICE_URL / AI_SERVICE_API_KEY が未設定です");
  }

  let res: Response;
  try {
    res = await fetch(`${baseUrl.replace(/\/$/, "")}/search`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({ query }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    // タイムアウト・名前解決失敗など
    throw new AiServiceError(
      err instanceof Error ? err.message : "AI サービスに接続できません"
    );
  }

  if (!res.ok) {
    throw new AiServiceError(`AI サービスがエラーを返しました (${res.status})`);
  }

  const body: { hits?: SearchHit[] } = await res.json();
  return body.hits ?? [];
}
