import { XMLParser } from "fast-xml-parser";
import type { ScrapedArticle } from "./types";

const FEED_URL = "https://zenn.dev/feed";

export async function scrapeZenn(): Promise<ScrapedArticle[]> {
  const res = await fetch(FEED_URL, {
    headers: { "User-Agent": "it-dashboard/1.0" },
  });
  if (!res.ok) throw new Error(`Zenn feed error: ${res.status}`);

  const xml = await res.text();
  const parser = new XMLParser({ ignoreAttributes: false });
  const data = parser.parse(xml);

  const items: unknown[] = data?.rss?.channel?.item ?? [];
  return items.map((item) => {
    const i = item as Record<string, unknown>;
    const categories = i.category
      ? Array.isArray(i.category)
        ? (i.category as string[])
        : [i.category as string]
      : [];
    return {
      sourceType: "ZENN" as const,
      title: String(i.title ?? ""),
      url: String(i.link ?? ""),
      publishedAt: i.pubDate ? new Date(String(i.pubDate)) : null,
      tags: categories,
    };
  });
}
