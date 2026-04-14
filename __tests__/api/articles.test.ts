import { GET } from "@/app/api/articles/route";
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
    id: "1",
    sourceType: "ZENN",
    title: "記事1",
    url: "https://zenn.dev/1",
    publishedAt: new Date("2026-04-14"),
    tags: ["TypeScript"],
    isRead: false,
    isFavorite: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "2",
    sourceType: "QIITA",
    title: "記事2",
    url: "https://qiita.com/2",
    publishedAt: new Date("2026-04-13"),
    tags: [],
    isRead: true,
    isFavorite: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

beforeEach(() => {
  jest.clearAllMocks();
});

function makeRequest(queryString = "") {
  return new NextRequest(`http://localhost:3000/api/articles${queryString}`);
}

describe("GET /api/articles", () => {
  test("正常系: クエリなしで全記事を返す", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindMany.mockResolvedValueOnce(MOCK_ARTICLES as any);

    const res = await GET(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(2);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });

  test("正常系: ?source=ZENN で sourceType フィルターが DB クエリに反映される", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindMany.mockResolvedValueOnce([MOCK_ARTICLES[0]] as any);

    const res = await GET(makeRequest("?source=ZENN"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sourceType: "ZENN" } })
    );
  });

  test("正常系: ?status=unread で isRead:false フィルターが反映される", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindMany.mockResolvedValueOnce([MOCK_ARTICLES[0]] as any);

    await GET(makeRequest("?status=unread"));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isRead: false } })
    );
  });

  test("正常系: ?status=read で isRead:true フィルターが反映される", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindMany.mockResolvedValueOnce([MOCK_ARTICLES[1]] as any);

    await GET(makeRequest("?status=read"));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isRead: true } })
    );
  });

  test("正常系: ?status=favorite で isFavorite:true フィルターが反映される", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindMany.mockResolvedValueOnce([MOCK_ARTICLES[1]] as any);

    await GET(makeRequest("?status=favorite"));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isFavorite: true } })
    );
  });

  test("正常系: 不正な source 値はフィルターに反映されない", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindMany.mockResolvedValueOnce(MOCK_ARTICLES as any);

    await GET(makeRequest("?source=INVALID"));

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
  });
});
