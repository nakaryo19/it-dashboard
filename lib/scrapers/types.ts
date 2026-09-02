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
  /**
   * 記事本文。埋め込み生成の品質を上げるために使う。
   * 規約上取得が許容されるソースのみ設定する（現状は Qiita API v2 の body のみ）。
   * 取得できない・空の場合は undefined。
   */
  bodyText?: string;
}
