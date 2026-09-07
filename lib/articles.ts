/**
 * 記事一覧の絞り込み条件と取得。
 * ページ（Server Component）と API Route で同じ条件を使うために切り出す。
 */
import { prisma } from "@/lib/prisma";
import type { SourceType } from "@/app/generated/prisma/enums";

const VALID_SOURCES = new Set([
  "ZENN",
  "QIITA",
  "GITHUB_TRENDING",
  "HACKER_NEWS",
]);

export interface ArticleFilter {
  source?: string | null;
  status?: string | null;
}

/** 不正な値は無視して、指定された条件だけを where に積む。 */
export function buildWhere({ source, status }: ArticleFilter) {
  const where: Record<string, unknown> = {};

  if (source && VALID_SOURCES.has(source.toUpperCase())) {
    where.sourceType = source.toUpperCase() as SourceType;
  }
  if (status === "read") {
    where.isRead = true;
  } else if (status === "unread") {
    where.isRead = false;
  } else if (status === "favorite") {
    where.isFavorite = true;
  }

  return where;
}

/**
 * 検索結果の記事 ID 配列から記事本体を取得する。
 *
 * フィルタは AND で適用し、並び順は ids の順（＝類似度順）を維持する。
 * フィルタで除外された記事は結果から落ちる。
 */
export async function findArticlesInOrder(
  ids: string[],
  filter: ArticleFilter
) {
  if (ids.length === 0) return [];

  const articles = await prisma.article.findMany({
    where: { ...buildWhere(filter), id: { in: ids } },
  });

  const order = new Map(ids.map((id, i) => [id, i]));
  return articles.sort(
    (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
  );
}
