import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: Request,
  ctx: RouteContext<"/api/articles/[id]/favorite">
) {
  const { id } = await ctx.params;

  const article = await prisma.article.findUnique({ where: { id } });
  if (!article) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.article.update({
    where: { id },
    data: { isFavorite: !article.isFavorite },
  });

  return NextResponse.json(updated);
}
