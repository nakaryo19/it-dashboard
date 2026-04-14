"use client";

import { useState, useCallback, useEffect } from "react";
import type { Article } from "@/app/generated/prisma/browser";
import ArticleCard from "./ArticleCard";

interface Props {
  initialArticles: Article[];
}

export default function ArticleList({ initialArticles }: Props) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);

  useEffect(() => {
    setArticles(initialArticles);
  }, [initialArticles]);

  const toggleRead = useCallback(async (id: string) => {
    // Optimistic update
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isRead: !a.isRead } : a))
    );
    try {
      const res = await fetch(`/api/articles/${id}/read`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed");
      const updated: Article = await res.json();
      setArticles((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch {
      // Revert on failure
      setArticles((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isRead: !a.isRead } : a))
      );
    }
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    // Optimistic update
    setArticles((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isFavorite: !a.isFavorite } : a))
    );
    try {
      const res = await fetch(`/api/articles/${id}/favorite`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed");
      const updated: Article = await res.json();
      setArticles((prev) => prev.map((a) => (a.id === id ? updated : a)));
    } catch {
      // Revert on failure
      setArticles((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isFavorite: !a.isFavorite } : a))
      );
    }
  }, []);

  if (articles.length === 0) {
    return null; // handled by parent with EmptyState
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {articles.map((article) => (
        <ArticleCard
          key={article.id}
          article={article}
          onToggleRead={toggleRead}
          onToggleFavorite={toggleFavorite}
        />
      ))}
    </div>
  );
}
