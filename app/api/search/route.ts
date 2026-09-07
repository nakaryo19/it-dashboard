import { NextRequest, NextResponse } from "next/server";
import { AiServiceError, searchArticleIds } from "@/lib/ai-service";
import { findArticlesInOrder } from "@/lib/articles";

/**
 * セマンティック検索。ai-service へプロキシし、記事本体を返す。
 *
 * AI サービスの URL と API キーはサーバー側の環境変数から読み、
 * クライアントには一切渡さない。
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const query = (searchParams.get("q") ?? "").trim();

  // 空クエリでは AI サービスを呼ばない
  if (!query) {
    return NextResponse.json([]);
  }

  try {
    const hits = await searchArticleIds(query);
    const articles = await findArticlesInOrder(
      hits.map((h) => h.id),
      { source: searchParams.get("source"), status: searchParams.get("status") }
    );
    return NextResponse.json(articles);
  } catch (err) {
    if (err instanceof AiServiceError) {
      // 検索だけを失敗させ、既存の記事一覧機能には影響させない
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
