"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

const SOURCES = [
  { value: "", label: "すべて" },
  { value: "ZENN", label: "Zenn" },
  { value: "QIITA", label: "Qiita" },
  { value: "GITHUB_TRENDING", label: "GitHub" },
  { value: "HACKER_NEWS", label: "HN" },
];

const STATUSES = [
  { value: "", label: "すべて" },
  { value: "unread", label: "未読" },
  { value: "read", label: "既読" },
  { value: "favorite", label: "お気に入り" },
];

export default function FilterBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get("source") ?? "";
  const status = searchParams.get("status") ?? "";

  const update = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-zinc-500">ソース</span>
        <div className="flex gap-1">
          {SOURCES.map((s) => (
            <button
              key={s.value}
              onClick={() => update("source", s.value)}
              data-testid={`source-filter-${s.value}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                source === s.value
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-zinc-500">状態</span>
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              onClick={() => update("status", s.value)}
              data-testid={`status-filter-${s.value}`}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                status === s.value
                  ? "bg-blue-600 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
