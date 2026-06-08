import { Category, DigestItem } from "./types";
import { fetchDevToDigest } from "./sources/devto";
import { fetchSubstackDigest } from "./sources/substack";
import { fetchHackerNewsDigest } from "./sources/hackernews";
import { fetchBlueskyDigest } from "./sources/bluesky";

export const CATEGORIES: Category[] = [
  "Tools & Products",
  "Tips & Tutorials",
  "Research & News",
];

export async function buildDigest(): Promise<Record<Category, DigestItem[]>> {
  const [devto, substack, hn, bluesky] = await Promise.all([
    fetchDevToDigest(),
    fetchSubstackDigest(),
    fetchHackerNewsDigest(),
    fetchBlueskyDigest(),
  ]);

  const all = [...devto, ...substack, ...hn, ...bluesky].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );

  const grouped: Record<Category, DigestItem[]> = {
    "Tools & Products": [],
    "Tips & Tutorials": [],
    "Research & News": [],
  };

  for (const item of all) grouped[item.category].push(item);
  return grouped;
}
