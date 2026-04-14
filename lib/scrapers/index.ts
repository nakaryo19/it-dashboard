import { scrapeZenn } from "./zenn";
import { scrapeQiita } from "./qiita";
import { scrapeGitHubTrending } from "./github-trending";
import { scrapeHackerNews } from "./hacker-news";
import type { ScrapedArticle, SourceType } from "./types";

export type { ScrapedArticle, SourceType };

export interface ScrapeResult {
  success: SourceType[];
  failed: { source: SourceType; error: string }[];
  articles: ScrapedArticle[];
}

const scrapers: { source: SourceType; fn: () => Promise<ScrapedArticle[]> }[] =
  [
    { source: "ZENN", fn: scrapeZenn },
    { source: "QIITA", fn: scrapeQiita },
    { source: "GITHUB_TRENDING", fn: scrapeGitHubTrending },
    { source: "HACKER_NEWS", fn: scrapeHackerNews },
  ];

export async function scrapeAll(): Promise<ScrapeResult> {
  const results = await Promise.allSettled(
    scrapers.map(({ fn }) => fn())
  );

  const success: SourceType[] = [];
  const failed: { source: SourceType; error: string }[] = [];
  const articles: ScrapedArticle[] = [];

  results.forEach((result, i) => {
    const { source } = scrapers[i];
    if (result.status === "fulfilled") {
      success.push(source);
      articles.push(...result.value);
    } else {
      failed.push({
        source,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      });
    }
  });

  return { success, failed, articles };
}
