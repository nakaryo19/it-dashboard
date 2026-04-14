import { scrapeHackerNews } from "@/lib/scrapers/hacker-news";

const MOCK_IDS = [1, 2, 3];

const MOCK_ITEMS: Record<number, object> = {
  1: {
    id: 1,
    type: "story",
    title: "Show HN: A new JavaScript runtime",
    url: "https://example.com/js-runtime",
    time: 1744610400, // 2026-04-14T09:00:00Z
    score: 200,
  },
  2: {
    id: 2,
    type: "story",
    title: "Ask HN: Best practices for TypeScript?",
    // url なし（Ask HN など）
    time: 1744610000,
    score: 150,
  },
  3: {
    id: 3,
    type: "story",
    title: "Introducing Rust 2.0",
    url: "https://blog.rust-lang.org/rust-2.0",
    time: 1744609000,
    score: 300,
  },
};

function setupFetchMock() {
  return jest.spyOn(global, "fetch").mockImplementation(async (input) => {
    const url = input.toString();

    if (url.includes("topstories.json")) {
      return new Response(JSON.stringify(MOCK_IDS), { status: 200 });
    }

    const idMatch = url.match(/item\/(\d+)\.json/);
    if (idMatch) {
      const id = Number(idMatch[1]);
      const item = MOCK_ITEMS[id];
      if (item) {
        return new Response(JSON.stringify(item), { status: 200 });
      }
    }

    return new Response(null, { status: 404 });
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe("scrapeHackerNews", () => {
  test("正常系: Firebase API からストーリーをパースして返す", async () => {
    setupFetchMock();

    const articles = await scrapeHackerNews();

    // url を持つ story のみ（id 1, 3）
    expect(articles).toHaveLength(2);
    expect(articles[0]).toMatchObject({
      sourceType: "HACKER_NEWS",
      title: "Show HN: A new JavaScript runtime",
      url: "https://example.com/js-runtime",
      tags: [],
    });
    expect(articles[0].publishedAt).toBeInstanceOf(Date);
  });

  test("正常系: url を持たない記事は除外される", async () => {
    setupFetchMock();

    const articles = await scrapeHackerNews();
    const askHN = articles.find((a) =>
      a.title.includes("Ask HN")
    );

    expect(askHN).toBeUndefined();
  });

  test("正常系: publishedAt が Unix タイムスタンプから Date に変換される", async () => {
    setupFetchMock();

    const articles = await scrapeHackerNews();
    const expected = new Date(1744610400 * 1000);

    expect(articles[0].publishedAt?.getTime()).toBe(expected.getTime());
  });

  test("異常系: topstories 取得が HTTP エラーの場合はスローする", async () => {
    jest
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    await expect(scrapeHackerNews()).rejects.toThrow(
      "HN topstories error: 500"
    );
  });
});
