"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ScrapeResult {
  success: string[];
  failed: { source: string; error: string }[];
  count: number;
}

export default function ScrapeButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);
  const router = useRouter();

  const handleScrape = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/scrape", { method: "POST" });
      const data: ScrapeResult = await res.json();
      setResult(data);
      router.refresh();
    } catch {
      setResult({ success: [], failed: [{ source: "all", error: "Network error" }], count: 0 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleScrape}
        disabled={loading}
        data-testid="scrape-button"
        className="flex w-28 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            取得中...
          </>
        ) : (
          "記事を取得"
        )}
      </button>
      {result && !loading && (
        <p data-testid="scrape-result" className="text-xs text-zinc-500">
          {result.count} 件取得（
          {result.success.join("・")}
          {result.failed.length > 0 && (
            <span className="text-red-500">
              {" "}/ 失敗: {result.failed.map((f) => f.source).join("・")}
            </span>
          )}
          ）
        </p>
      )}
    </div>
  );
}
