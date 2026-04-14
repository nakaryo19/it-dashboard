import { PATCH } from "@/app/api/articles/[id]/favorite/route";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    article: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

const mockFindUnique = prisma.article.findUnique as jest.MockedFunction<
  typeof prisma.article.findUnique
>;
const mockUpdate = prisma.article.update as jest.MockedFunction<
  typeof prisma.article.update
>;

const MOCK_ARTICLE = {
  id: "test-id",
  sourceType: "ZENN" as const,
  title: "テスト記事",
  url: "https://zenn.dev/test",
  publishedAt: new Date("2026-04-14"),
  tags: ["TypeScript"],
  isRead: false,
  isFavorite: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeCtx(id: string) {
  return {
    params: Promise.resolve({ id }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PATCH /api/articles/[id]/favorite", () => {
  test("正常系: isFavorite=false の記事を true にトグルする", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindUnique.mockResolvedValueOnce(MOCK_ARTICLE as any);
    const updated = { ...MOCK_ARTICLE, isFavorite: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUpdate.mockResolvedValueOnce(updated as any);

    const res = await PATCH(new Request("http://localhost"), makeCtx("test-id"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.isFavorite).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "test-id" },
      data: { isFavorite: true },
    });
  });

  test("正常系: isFavorite=true の記事を false にトグルする", async () => {
    const favArticle = { ...MOCK_ARTICLE, isFavorite: true };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindUnique.mockResolvedValueOnce(favArticle as any);
    const updated = { ...favArticle, isFavorite: false };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUpdate.mockResolvedValueOnce(updated as any);

    const res = await PATCH(new Request("http://localhost"), makeCtx("test-id"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.isFavorite).toBe(false);
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: "test-id" },
      data: { isFavorite: false },
    });
  });

  test("異常系: 存在しない id の場合は 404 を返す", async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const res = await PATCH(new Request("http://localhost"), makeCtx("no-such-id"));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe("Not found");
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
