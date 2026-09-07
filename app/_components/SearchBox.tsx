"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * 検索ボックス。入力値は URL の `q` と同期する。
 * 検索そのものは Server Component 側で実行するため、ここでは URL を更新するだけ。
 */
export default function SearchBox() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";
  const [value, setValue] = useState(q);

  // 戻る/進む・フィルタ操作などで URL が変わったら入力欄も追従させる
  useEffect(() => {
    setValue(q);
  }, [q]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
    router.push(params.toString() ? `?${params.toString()}` : "/");
  };

  const clear = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    setValue("");
    router.push(params.toString() ? `?${params.toString()}` : "/");
  };

  return (
    <div>
      <form onSubmit={submit} className="flex gap-2">
        <input
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="やりたいことを自然文で入力（例: Rustの非同期処理でつまずくところ）"
          data-testid="search-input"
          className="flex-1 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none"
        />
        <button
          type="submit"
          data-testid="search-submit"
          className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          検索
        </button>
        {q && (
          <button
            type="button"
            onClick={clear}
            data-testid="search-clear"
            className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-200"
          >
            クリア
          </button>
        )}
      </form>
      <p className="mt-2 text-xs text-zinc-400">
        検索は記事の要約情報に基づきます。ソースにより取得できる情報量が異なるため、結果の精度に差が出ます。
      </p>
    </div>
  );
}
