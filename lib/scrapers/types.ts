export type SourceType =
  | "ZENN"
  | "QIITA"
  | "GITHUB_TRENDING"
  | "HACKER_NEWS";

export interface ScrapedArticle {
  sourceType: SourceType;
  title: string;
  url: string;
  publishedAt: Date | null;
  tags: string[];
}
