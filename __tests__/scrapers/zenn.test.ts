import { scrapeZenn } from "@/lib/scrapers/zenn";

const VALID_RSS = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Zenn</title>
    <item>
      <title>TypeScript入門</title>
      <link>https://zenn.dev/user/articles/abc123</link>
      <pubDate>Mon, 14 Apr 2026 00:00:00 +0000</pubDate>
      <category>TypeScript</category>
      <category>JavaScript</category>
    </item>
    <item>
      <title>Next.js解説</title>
      <link>https://zenn.dev/user/articles/def456</link>
      <pubDate>Sun, 13 Apr 2026 00:00:00 +0000</pubDate>
    </item>
  </channel>
</rss>`;

function mockFetchOk(body: string, contentType = "application/xml") {
  return jest.spyOn(global, "fetch").mockResolvedValueOnce(
    new Response(body, {
      status: 200,
      headers: { "Content-Type": contentType },
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

describe("scrapeZenn", () => {
  test("正常系: RSS XML から記事をパースして返す", async () => {
    mockFetchOk(VALID_RSS);

    const articles = await scrapeZenn();

    expect(articles).toHaveLength(2);
    expect(articles[0]).toMatchObject({
      sourceType: "ZENN",
      title: "TypeScript入門",
      url: "https://zenn.dev/user/articles/abc123",
      tags: ["TypeScript", "JavaScript"],
    });
    expect(articles[0].publishedAt).toBeInstanceOf(Date);
  });

  test("正常系: category がない記事は tags が空配列になる", async () => {
    mockFetchOk(VALID_RSS);

    const articles = await scrapeZenn();

    expect(articles[1].tags).toEqual([]);
  });

  test("異常系: fetch が HTTP エラーを返した場合はエラーをスローする", async () => {
    mockFetchError(500);

    await expect(scrapeZenn()).rejects.toThrow("Zenn feed error: 500");
  });
});
