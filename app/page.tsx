import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import type { SourceType } from "@/app/generated/prisma/enums";
import ScrapeButton from "./_components/ScrapeButton";
import FilterBar from "./_components/FilterBar";
import ArticleList from "./_components/ArticleList";

const VALID_SOURCES = new Set(["ZENN", "QIITA", "GITHUB_TRENDING", "HACKER_NEWS"]);

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { source, status } = await searchParams;
  const sourceStr = typeof source === "string" ? source : undefined;
  const statusStr = typeof status === "string" ? status : undefined;

  const where: Record<string, unknown> = {};
  if (sourceStr && VALID_SOURCES.has(sourceStr.toUpperCase())) {
    where.sourceType = sourceStr.toUpperCase() as SourceType;
  }
  if (statusStr === "read") {
    where.isRead = true;
  } else if (statusStr === "unread") {
    where.isRead = false;
  } else if (statusStr === "favorite") {
    where.isFavorite = true;
  }

  const articles = await prisma.article.findMany({
    where,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });

  const isEmpty = articles.length === 0;
  const isFavoriteFilter = statusStr === "favorite";

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">IT情報ダッシュボード</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Zenn・Qiita・GitHub Trending・Hacker News
            </p>
          </div>
          <ScrapeButton />
        </div>

        {/* Filters */}
        <div className="mb-6">
          <Suspense fallback={<div className="h-8" />}>
            <FilterBar />
          </Suspense>
        </div>

        {/* Article list */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-20 text-center">
            {isFavoriteFilter ? (
              <>
                <p className="text-3xl">☆</p>
                <p className="mt-3 font-medium text-zinc-700">お気に入りに登録した記事はありません</p>
                <p className="mt-1 text-sm text-zinc-400">
                  記事カードの ☆ ボタンで登録できます
                </p>
              </>
            ) : (
              <>
                <p className="text-3xl">📭</p>
                <p className="mt-3 font-medium text-zinc-700">記事がありません</p>
                <p className="mt-1 text-sm text-zinc-400">
                  「記事を取得」ボタンで最新記事を取得してください
                </p>
              </>
            )}
          </div>
        ) : (
          <ArticleList initialArticles={articles} />
        )}
      </div>
    </div>
  );
}
