export type Category = "Tools & Products" | "Tips & Tutorials" | "Research & News";

export type SourceType = "DevTo" | "Substack" | "HackerNews" | "GitHub" | "Bluesky";

export interface DigestItem {
  id: string;
  title: string;
  url: string;
  source: SourceType;
  sourceName: string;
  author?: string;
  score?: number;
  /** GitHub repos only: approximate stars gained per day since creation. */
  velocity?: number;
  snippet?: string;
  publishedAt: string;
  category: Category;
}
