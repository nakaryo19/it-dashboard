import type { ScrapedArticle } from "./types";

const HN_BASE = "https://hacker-news.firebaseio.com/v0";
const TOP_STORIES_LIMIT = 20;

interface HNItem {
  id: number;
  title: string;
  url?: string;
  time: number;
  score: number;
  type: string;
}

export async function scrapeHackerNews(): Promise<ScrapedArticle[]> {
  const idsRes = await fetch(`${HN_BASE}/topstories.json`);
  if (!idsRes.ok) throw new Error(`HN topstories error: ${idsRes.status}`);

  const ids: number[] = await idsRes.json();
  const topIds = ids.slice(0, TOP_STORIES_LIMIT);

  const items = await Promise.all(
    topIds.map((id) =>
      fetch(`${HN_BASE}/item/${id}.json`).then((r) => r.json() as Promise<HNItem>)
    )
  );

  return items
    .filter((item) => item.type === "story" && item.url)
    .map((item) => ({
      sourceType: "HACKER_NEWS" as const,
      title: item.title,
      url: item.url!,
      publishedAt: item.time ? new Date(item.time * 1000) : null,
      tags: [],
    }));
}
