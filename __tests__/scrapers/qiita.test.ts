import { scrapeQiita } from "@/lib/scrapers/qiita";

const MOCK_ITEMS = [
  {
    title: "Rustで作るWebサーバー",
    url: "https://qiita.com/user/items/abc123",
    created_at: "2026-04-14T09:00:00+09:00",
    tags: [{ name: "Rust" }, { name: "Web" }],
  },
  {
    title: "Go言語入門",
    url: "https://qiita.com/user/items/def456",
    created_at: "2026-04-13T18:00:00+09:00",
    tags: [],
  },
];

function mockFetchJson(data: unknown) {
  return jest.spyOn(global, "fetch").mockResolvedValueOnce(
    new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
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

describe("scrapeQiita", () => {
  test("正常系: API レスポンスから記事をパースして返す", async () => {
    mockFetchJson(MOCK_ITEMS);

    const articles = await scrapeQiita();

    expect(articles).toHaveLength(2);
    expect(articles[0]).toMatchObject({
      sourceType: "QIITA",
      title: "Rustで作るWebサーバー",
      url: "https://qiita.com/user/items/abc123",
      tags: ["Rust", "Web"],
    });
    expect(articles[0].publishedAt).toBeInstanceOf(Date);
  });

  test("正常系: タグなし記事は tags が空配列になる", async () => {
    mockFetchJson(MOCK_ITEMS);

    const articles = await scrapeQiita();

    expect(articles[1].tags).toEqual([]);
  });

  test("異常系: HTTP 429 が返った場合はエラーをスローする", async () => {
    mockFetchError(429);

    await expect(scrapeQiita()).rejects.toThrow("Qiita API error: 429");
  });
});
