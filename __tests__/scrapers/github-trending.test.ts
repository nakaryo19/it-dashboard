import { scrapeGitHubTrending } from "@/lib/scrapers/github-trending";

// GitHub Trending HTML の最小構造を再現
const MOCK_HTML = `
<html>
<body>
  <article class="Box-row">
    <h2 class="h3 lh-condensed">
      <a href="/vercel/next.js" data-view-component="true">
        vercel/next.js
      </a>
    </h2>
    <span itemprop="programmingLanguage">TypeScript</span>
  </article>
  <article class="Box-row">
    <h2 class="h3 lh-condensed">
      <a href="/torvalds/linux">
        torvalds / linux
      </a>
    </h2>
    <span itemprop="programmingLanguage">C</span>
  </article>
  <article class="Box-row">
    <h2 class="h3 lh-condensed">
      <a href="/golang/go">
        golang/go
      </a>
    </h2>
  </article>
</body>
</html>`;

function mockFetchHtml(html: string) {
  return jest.spyOn(global, "fetch").mockResolvedValueOnce(
    new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    })
  );
}

function mockFetchError(status: number) {
  return jest.spyOn(global, "fetch").mockResolvedValueOnce(
    new Response(null, { status })
  );
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("scrapeGitHubTrending", () => {
  test("正常系: HTML からリポジトリを抽出して返す", async () => {
    mockFetchHtml(MOCK_HTML);

    const articles = await scrapeGitHubTrending();

    expect(articles.length).toBeGreaterThanOrEqual(1);
    expect(articles[0].sourceType).toBe("GITHUB_TRENDING");
  });

  test("正常系: url が https://github.com/owner/repo 形式になる", async () => {
    mockFetchHtml(MOCK_HTML);

    const articles = await scrapeGitHubTrending();
    const next = articles.find((a) => a.url.includes("next.js"));

    expect(next).toBeDefined();
    expect(next!.url).toBe("https://github.com/vercel/next.js");
    expect(next!.title).toBe("vercel/next.js");
  });

  test("正常系: 言語バッジが tags に入る", async () => {
    mockFetchHtml(MOCK_HTML);

    const articles = await scrapeGitHubTrending();
    const next = articles.find((a) => a.url.includes("next.js"));

    expect(next!.tags).toEqual(["TypeScript"]);
  });

  test("正常系: 言語バッジがない場合は tags が空配列", async () => {
    mockFetchHtml(MOCK_HTML);

    const articles = await scrapeGitHubTrending();
    const golang = articles.find((a) => a.url.includes("golang/go"));

    expect(golang).toBeDefined();
    expect(golang!.tags).toEqual([]);
  });

  test("正常系: publishedAt は null", async () => {
    mockFetchHtml(MOCK_HTML);

    const articles = await scrapeGitHubTrending();

    expect(articles[0].publishedAt).toBeNull();
  });

  test("正常系: h2 の a タグを持たない article ブロックはスキップされる", async () => {
    const htmlWithInvalidBlock = `
<html><body>
  <article class="Box-row">
    <p>リンクのない不正なブロック</p>
  </article>
  <article class="Box-row">
    <h2><a href="/valid/repo">valid/repo</a></h2>
  </article>
</body></html>`;
    mockFetchHtml(htmlWithInvalidBlock);

    const articles = await scrapeGitHubTrending();

    // 不正なブロックはスキップされ、有効な1件のみ返る
    expect(articles).toHaveLength(1);
    expect(articles[0].url).toBe("https://github.com/valid/repo");
  });

  test("異常系: HTTP 503 が返った場合はエラーをスローする", async () => {
    mockFetchError(503);

    await expect(scrapeGitHubTrending()).rejects.toThrow(
      "GitHub Trending error: 503"
    );
  });
});
