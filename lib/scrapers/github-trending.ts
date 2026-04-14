import type { ScrapedArticle } from "./types";

const TRENDING_URL = "https://github.com/trending";

export async function scrapeGitHubTrending(): Promise<ScrapedArticle[]> {
  const res = await fetch(TRENDING_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; it-dashboard/1.0)",
    },
  });
  if (!res.ok) throw new Error(`GitHub Trending error: ${res.status}`);

  const html = await res.text();
  const articles: ScrapedArticle[] = [];

  // Extract <article class="Box-row"> blocks
  const articleRegex = /<article[^>]*class="[^"]*Box-row[^"]*"[^>]*>([\s\S]*?)<\/article>/gi;
  let match: RegExpExecArray | null;

  while ((match = articleRegex.exec(html)) !== null) {
    const block = match[1];

    // Repository name: <h2 ...><a href="/owner/repo">
    const repoMatch = block.match(/<h2[^>]*>[\s\S]*?<a[^>]+href="\/([^"]+)"[^>]*>/i);
    if (!repoMatch) continue;
    const repoPath = repoMatch[1].trim();
    const url = `https://github.com/${repoPath}`;

    // Title from repo path (e.g. "owner/repo" → "owner/repo")
    const title = repoPath;

    // Language badge
    const langMatch = block.match(
      /<span[^>]+itemprop="programmingLanguage"[^>]*>\s*([^<]+)\s*<\/span>/i
    );
    const tags = langMatch ? [langMatch[1].trim()] : [];

    articles.push({
      sourceType: "GITHUB_TRENDING" as const,
      title,
      url,
      publishedAt: null,
      tags,
    });
  }

  return articles;
}
