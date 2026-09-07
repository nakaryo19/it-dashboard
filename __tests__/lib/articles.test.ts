jest.mock("@/lib/prisma", () => ({
  prisma: { article: { findMany: jest.fn() } },
}));

import { buildWhere, findArticlesInOrder } from "@/lib/articles";
import { prisma } from "@/lib/prisma";

const mockFindMany = prisma.article.findMany as jest.MockedFunction<
  typeof prisma.article.findMany
>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("buildWhere", () => {
  test("条件なしなら空オブジェクト", () => {
    expect(buildWhere({})).toEqual({});
  });

  test("source は大文字化して sourceType になる", () => {
    expect(buildWhere({ source: "zenn" })).toEqual({ sourceType: "ZENN" });
  });

  test("未知の source は無視する", () => {
    expect(buildWhere({ source: "INVALID" })).toEqual({});
  });

  test.each([
    ["read", { isRead: true }],
    ["unread", { isRead: false }],
    ["favorite", { isFavorite: true }],
  ])("status=%s は %o になる", (status, expected) => {
    expect(buildWhere({ status })).toEqual(expected);
  });

  test("未知の status は無視する", () => {
    expect(buildWhere({ status: "archived" })).toEqual({});
  });
});

describe("findArticlesInOrder", () => {
  test("ID 配列の順序（類似度順）を維持する", async () => {
    mockFindMany.mockResolvedValueOnce([
      { id: "a" },
      { id: "b" },
      { id: "c" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ] as any);

    const result = await findArticlesInOrder(["c", "a", "b"], {});

    expect(result.map((a) => a.id)).toEqual(["c", "a", "b"]);
  });

  test("フィルタで除外された記事は結果に含まれない", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockFindMany.mockResolvedValueOnce([{ id: "a" }] as any);

    const result = await findArticlesInOrder(["a", "b"], { source: "ZENN" });

    expect(result.map((r) => r.id)).toEqual(["a"]);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { sourceType: "ZENN", id: { in: ["a", "b"] } },
    });
  });

  test("ID が空なら DB を引かない", async () => {
    expect(await findArticlesInOrder([], {})).toEqual([]);
    expect(mockFindMany).not.toHaveBeenCalled();
  });
});
