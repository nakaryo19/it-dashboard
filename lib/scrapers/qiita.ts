import type { ScrapedArticle } from "./types";

const API_URL = "https://qiita.com/api/v2/items?per_page=20&page=1";

interface QiitaItem {
  title: string;
  url: string;
  created_at: string;
  tags: { name: string }[];
  /** Markdown 形式の本文。API v2 の items レスポンスに含まれる。 */
  body?: unknown;
}

/**
 * API が返す body を bodyText として使える形に正規化する。
 * 文字列でない・空白のみの場合は undefined を返し、記事自体の保存は妨げない。
 */
function normalizeBody(body: unknown): string | undefined {
  if (typeof body !== "string") return undefined;
  const trimmed = body.trim();
  return trimmed === "" ? undefined : trimmed;
}

export async function scrapeQiita(): Promise<ScrapedArticle[]> {
  const res = await fetch(API_URL, {
    headers: { "User-Agent": "it-dashboard/1.0" },
  });
  if (!res.ok) throw new Error(`Qiita API error: ${res.status}`);

  const items: QiitaItem[] = await res.json();
  return items.map((item) => ({
    sourceType: "QIITA" as const,
    title: item.title,
    url: item.url,
    publishedAt: new Date(item.created_at),
    tags: item.tags.map((t) => t.name),
    bodyText: normalizeBody(item.body),
  }));
}
