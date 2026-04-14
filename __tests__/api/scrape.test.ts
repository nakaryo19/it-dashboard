import { POST } from "@/app/api/scrape/route";
import type { ScrapeResult } from "@/lib/scrapers";

// lib/scrapers と lib/prisma をモック
jest.mock("@/lib/scrapers", () => ({
  scrapeAll: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      upsert: jest.fn(),
    },
  },
}));

import { scrapeAll } from "@/lib/scrapers";
import { prisma } from "@/lib/prisma";

const mockScrapeAll = scrapeAll as jest.MockedFunction<typeof scrapeAll>;
const mockUpsert = prisma.article.upsert as jest.MockedFunction<
  typeof prisma.article.upsert
>;

const MOCK_ARTICLE = {
  sourceType: "ZENN" as const,
  title: "テスト記事",
  url: "https://zenn.dev/test",
  publishedAt: new Date("2026-04-14"),
  tags: ["TypeScript"],
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("POST /api/scrape", () => {
  test("正常系: スクレイプ成功時に count と success を返す", async () => {
    mockScrapeAll.mockResolvedValueOnce({
      success: ["ZENN"],
      failed: [],
      articles: [MOCK_ARTICLE],
    } as ScrapeResult);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUpsert.mockResolvedValueOnce({ id: "cuid1", ...MOCK_ARTICLE } as any);

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(1);
    expect(body.success).toContain("ZENN");
    expect(body.failed).toHaveLength(0);
  });

  test("異常系: 全ソース失敗時は count=0 かつ failed に詳細が入る", async () => {
    mockScrapeAll.mockResolvedValueOnce({
      success: [],
      failed: [{ source: "ZENN" as const, error: "Network error" }],
      articles: [],
    } as ScrapeResult);

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.count).toBe(0);
    expect(body.failed).toHaveLength(1);
    expect(body.failed[0].source).toBe("ZENN");
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  test("異常系: scrapeAll が例外をスローした場合は 500 を返す", async () => {
    mockScrapeAll.mockRejectedValueOnce(new Error("Unexpected error"));

    const res = await POST();
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("Unexpected error");
  });
});
