-- pgvector 拡張。Prisma は vector 型を生成できないため手動で記述する。
CREATE EXTENSION IF NOT EXISTS vector;

-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "bodyText" TEXT,
ADD COLUMN     "embedding" vector(1536),
ADD COLUMN     "embeddingModel" TEXT;
