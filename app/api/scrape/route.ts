import { NextResponse } from "next/server";
import { scrapeAll } from "@/lib/scrapers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const { success, failed, articles } = await scrapeAll();

    const upserted = await Promise.all(
      articles.map((article) =>
        prisma.article.upsert({
          where: { url: article.url },
          create: {
            sourceType: article.sourceType,
            title: article.title,
            url: article.url,
            publishedAt: article.publishedAt,
            tags: article.tags,
          },
          update: {
            title: article.title,
            publishedAt: article.publishedAt,
            tags: article.tags,
          },
        })
      )
    );

    return NextResponse.json({
      success,
      failed,
      count: upserted.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
