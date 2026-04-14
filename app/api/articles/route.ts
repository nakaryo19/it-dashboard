import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { SourceType } from "@/app/generated/prisma/enums";

const VALID_SOURCES = new Set(["ZENN", "QIITA", "GITHUB_TRENDING", "HACKER_NEWS"]);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const source = searchParams.get("source");
  const status = searchParams.get("status");

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

  const articles = await prisma.article.findMany({
    where,
    orderBy: { publishedAt: "desc" },
  });

  return NextResponse.json(articles);
}
