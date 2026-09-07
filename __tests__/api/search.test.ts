import { GET } from "@/app/api/search/route";
import { NextRequest } from "next/server";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockFindMany = prisma.article.findMany as jest.MockedFunction<
  typeof prisma.article.findMany
>;

const MOCK_ARTICLES = [
  {
    id: "a1",
    sourceType: "ZENN",
    title: "非同期処理の記事",
    url: "https://zenn.dev/1",
    publishedAt: new Date("2026-04-14"),
    tags: [],
    isRead: false,
    isFavorite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "a2",
    sourceType: "QIITA",
    title: "型システムの記事",
    url: "https://qiita.com/2",
    publishedAt: new Date("2026-04-13"),
    tags: [],
    isRead: true,
    isFavorite: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockFetch = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = mockFetch as unknown as typeof fetch;
  process.env.AI_SERVICE_URL = "https://ai.example.com";
  process.env.AI_SERVICE_API_KEY = "test-key";
});

function mockAiHits(hits: { id: string; score: number }[]) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    json: async () => ({ hits }),
  });
}

function makeRequest(queryString = "") {
  return new NextRequest(`http://localhost:3000/api/search${queryString}`);
}

describe("GET /api/search", () => {
  test("正常系: 検索結果の記事を類似度順で返す", async () => {
    mockAiHits([
      { id: "a2", score: 0.8 },
      { id: "a1", score: 0.5 },
    ]);
    // Prisma は ID 順を保証しないため、意図的に逆順を返す
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindMany.mockResolvedValueOnce(MOCK_ARTICLES as any);

    const res = await GET(makeRequest("?q=非同期"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.map((a: { id: string }) => a.id)).toEqual(["a2", "a1"]);
  });

  test("正常系: AI サービスにはクエリのみを渡し API キーをヘッダーで送る", async () => {
    mockAiHits([{ id: "a1", score: 0.5 }]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindMany.mockResolvedValueOnce([MOCK_ARTICLES[0]] as any);

    await GET(makeRequest("?q=Rust"));

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://ai.example.com/search");
    expect(init.headers["X-API-Key"]).toBe("test-key");
    expect(JSON.parse(init.body)).toEqual({ query: "Rust" });
  });

  test("正常系: source フィルタが検索結果に AND で適用される", async () => {
    mockAiHits([{ id: "a1", score: 0.5 }]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindMany.mockResolvedValueOnce([MOCK_ARTICLES[0]] as any);

    await GET(makeRequest("?q=Rust&source=ZENN"));

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { sourceType: "ZENN", id: { in: ["a1"] } },
    });
  });

  test("正常系: status フィルタが検索結果に AND で適用される", async () => {
    mockAiHits([{ id: "a2", score: 0.5 }]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindMany.mockResolvedValueOnce([MOCK_ARTICLES[1]] as any);

    await GET(makeRequest("?q=Rust&status=favorite"));

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { isFavorite: true, id: { in: ["a2"] } },
    });
  });

  test("正常系: 空クエリでは AI サービスを呼ばず空配列を返す", async () => {
    const res = await GET(makeRequest("?q=%20%20"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  test("正常系: 検索結果0件なら DB を引かず空配列を返す", async () => {
    mockAiHits([]);

    const res = await GET(makeRequest("?q=無関係な語"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });

  test("異常系: AI サービスがエラーを返したら 503", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const res = await GET(makeRequest("?q=Rust"));

    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain("500");
  });

  test("異常系: AI サービスに接続できない場合も 503", async () => {
    mockFetch.mockRejectedValueOnce(new Error("timeout"));

    const res = await GET(makeRequest("?q=Rust"));

    expect(res.status).toBe(503);
  });

  test("異常系: 環境変数が未設定なら AI サービスを呼ばずに 503", async () => {
    delete process.env.AI_SERVICE_URL;

    const res = await GET(makeRequest("?q=Rust"));

    expect(res.status).toBe(503);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
