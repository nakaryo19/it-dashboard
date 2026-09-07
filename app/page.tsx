import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { buildWhere, findArticlesInOrder } from "@/lib/articles";
import { AiServiceError, searchArticleIds } from "@/lib/ai-service";
import ScrapeButton from "./_components/ScrapeButton";
import FilterBar from "./_components/FilterBar";
import SearchBox from "./_components/SearchBox";
import ArticleList from "./_components/ArticleList";
import type { Article } from "@/app/generated/prisma/client";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { source, status, q } = await searchParams;
  const sourceStr = typeof source === "string" ? source : undefined;
  const statusStr = typeof status === "string" ? status : undefined;
  const query = typeof q === "string" ? q.trim() : "";

  const filter = { source: sourceStr, status: statusStr };

  let articles: Article[] = [];
  let searchError: string | null = null;

  if (query) {
    // 検索モード: AI サービスで類似記事の ID を得てから記事本体を引く
    try {
      const hits = await searchArticleIds(query);
      articles = await findArticlesInOrder(
        hits.map((h) => h.id),
        filter
      );
    } catch (err) {
      // AI サービスが落ちていても記事一覧・フィルタは使えるようにする
      searchError =
        err instanceof AiServiceError
          ? "検索サービスに接続できませんでした。記事一覧を表示しています。"
          : "検索中にエラーが発生しました。記事一覧を表示しています。";
      articles = await prisma.article.findMany({
        where: buildWhere(filter),
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      });
    }
  } else {
    articles = await prisma.article.findMany({
      where: buildWhere(filter),
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    });
  }

  const isEmpty = articles.length === 0;
  const isFavoriteFilter = statusStr === "favorite";
  const isSearchResult = Boolean(query) && !searchError;

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

        {/* Search */}
        <div className="mb-6">
          <Suspense fallback={<div className="h-16" />}>
            <SearchBox />
          </Suspense>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <Suspense fallback={<div className="h-8" />}>
            <FilterBar />
          </Suspense>
        </div>

        {searchError && (
          <div
            data-testid="search-error"
            className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
          >
            {searchError}
          </div>
        )}

        {isSearchResult && !isEmpty && (
          <p className="mb-4 text-sm text-zinc-500">
            「{query}」の検索結果 {articles.length} 件（関連度順）
          </p>
        )}

        {/* Article list */}
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white py-20 text-center">
            {isSearchResult ? (
              <>
                <p className="text-3xl">🔍</p>
                <p
                  data-testid="search-empty"
                  className="mt-3 font-medium text-zinc-700"
                >
                  該当する記事がありません
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  別の言い回しで検索するか、フィルタを外してみてください
                </p>
              </>
            ) : isFavoriteFilter ? (
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
