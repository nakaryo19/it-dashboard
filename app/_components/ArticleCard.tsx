"use client";

import type { Article } from "@/app/generated/prisma/browser";

const SOURCE_BADGE: Record<string, { label: string; className: string }> = {
  ZENN: { label: "Zenn", className: "bg-blue-100 text-blue-700" },
  QIITA: { label: "Qiita", className: "bg-green-100 text-green-700" },
  GITHUB_TRENDING: { label: "GitHub", className: "bg-zinc-200 text-zinc-700" },
  HACKER_NEWS: { label: "HN", className: "bg-orange-100 text-orange-700" },
};

interface Props {
  article: Article;
  onToggleRead: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export default function ArticleCard({ article, onToggleRead, onToggleFavorite }: Props) {
  const badge = SOURCE_BADGE[article.sourceType] ?? {
    label: article.sourceType,
    className: "bg-zinc-100 text-zinc-600",
  };

  const handleTitleClick = () => {
    if (!article.isRead) {
      onToggleRead(article.id);
    }
  };

  const publishedDate = article.publishedAt
    ? new Date(article.publishedAt).toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
    : null;

  return (
    <div
      data-testid="article-card"
      className={`flex flex-col gap-2 rounded-xl border p-4 transition-colors ${
        article.isRead
          ? "border-zinc-100 bg-zinc-50"
          : "border-zinc-200 bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${badge.className}`}
          >
            {badge.label}
          </span>
          {publishedDate && (
            <span className="text-xs text-zinc-400">{publishedDate}</span>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={() => onToggleFavorite(article.id)}
            title={article.isFavorite ? "お気に入り解除" : "お気に入り登録"}
            className="rounded p-1 text-lg leading-none transition-colors hover:bg-zinc-100"
          >
            {article.isFavorite ? "★" : "☆"}
          </button>
          <button
            onClick={() => onToggleRead(article.id)}
            title={article.isRead ? "未読に戻す" : "既読にする"}
            data-testid="read-toggle"
            className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
              article.isRead
                ? "bg-zinc-200 text-zinc-500 hover:bg-zinc-300"
                : "bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
          >
            {article.isRead ? "既読" : "未読"}
          </button>
        </div>
      </div>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleTitleClick}
        data-testid="article-title"
        className={`text-sm font-medium leading-snug hover:underline ${
          article.isRead ? "text-zinc-400" : "text-zinc-900"
        }`}
      >
        {article.title}
      </a>
      {article.tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {article.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
