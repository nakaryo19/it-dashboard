-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('ZENN', 'QIITA', 'GITHUB_TRENDING', 'HACKER_NEWS');

-- CreateTable
CREATE TABLE "Article" (
    "id" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "tags" TEXT[],
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isFavorite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Article_url_key" ON "Article"("url");
