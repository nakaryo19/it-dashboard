/**
 * 既存の Qiita 記事に本文（bodyText）を後追いで埋めるワンショットスクリプト。
 *
 * 定期スクレイピングは新着 20 件しか取得しないため、それ以前に収集済みの記事は
 * bodyText が NULL のまま残る。埋め込み生成（Phase A）の品質を確保するために、
 * URL から記事 ID を取り出して Qiita API v2 の個別取得エンドポイントを叩く。
 *
 * 実行:
 *   npx tsx scripts/backfill-qiita-body.ts [--dry-run] [--limit N]
 *
 * QIITA_TOKEN を設定すると 1000 req/h、未設定だと 60 req/h。
 */
import "dotenv/config";
import { prisma } from "../lib/prisma";
import { normalizeBody } from "../lib/scrapers/qiita";

const ITEM_URL_PATTERN = /^https:\/\/qiita\.com\/[^/]+\/items\/([0-9a-zA-Z]+)$/;

/** 未認証は 60 req/h のため、トークンが無いときは十分な間隔を空ける。 */
const TOKEN = process.env.QIITA_TOKEN;
const INTERVAL_MS = TOKEN ? 200 : 61_000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface FetchResult {
  status: "updated" | "empty" | "notfound" | "error";
  detail?: string;
}

async function fetchBody(itemId: string): Promise<FetchResult> {
  const res = await fetch(`https://qiita.com/api/v2/items/${itemId}`, {
    headers: {
      "User-Agent": "it-dashboard/1.0",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
    },
  });

  if (res.status === 404) return { status: "notfound" };
  if (!res.ok) {
    return { status: "error", detail: `HTTP ${res.status}` };
  }

  const item: { body?: unknown } = await res.json();
  const body = normalizeBody(item.body);
  return body === undefined
    ? { status: "empty" }
    : { status: "updated", detail: body };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const limitArg = process.argv.indexOf("--limit");
  const limit =
    limitArg !== -1 ? Number(process.argv[limitArg + 1]) : undefined;

  const targets = await prisma.article.findMany({
    where: { sourceType: "QIITA", bodyText: null },
    select: { id: true, url: true, title: true },
    orderBy: { publishedAt: "desc" },
    ...(limit ? { take: limit } : {}),
  });

  console.log(
    `対象 ${targets.length} 件 / 認証: ${TOKEN ? "あり (1000 req/h)" : "なし (60 req/h)"}` +
      `${dryRun ? " / dry-run" : ""}`
  );

  const counts = { updated: 0, empty: 0, notfound: 0, error: 0, skipped: 0 };

  for (const [i, article] of targets.entries()) {
    const match = article.url.match(ITEM_URL_PATTERN);
    if (!match) {
      counts.skipped++;
      console.warn(`[skip] ID を抽出できない URL: ${article.url}`);
      continue;
    }

    try {
      const result = await fetchBody(match[1]);

      if (result.status === "updated") {
        if (!dryRun) {
          await prisma.article.update({
            where: { id: article.id },
            data: { bodyText: result.detail },
          });
        }
        counts.updated++;
      } else {
        counts[result.status]++;
        if (result.status === "error") {
          console.warn(`[error] ${article.url}: ${result.detail}`);
        }
      }
    } catch (err) {
      // 1件の失敗で全体を止めない
      counts.error++;
      console.warn(
        `[error] ${article.url}: ${err instanceof Error ? err.message : err}`
      );
    }

    if (i % 10 === 9) console.log(`  ...${i + 1}/${targets.length}`);
    if (i < targets.length - 1) await sleep(INTERVAL_MS);
  }

  console.log("完了:", counts);
  await prisma.$disconnect();
}

main();
