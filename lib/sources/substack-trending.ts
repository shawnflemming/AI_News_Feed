import { SubstackPublication } from "./substack-leaderboard";

// For each AI Substack we discovered via the leaderboard, pull recent posts
// from the public per-publication posts endpoint and rank them by reaction
// count — a real "trending by engagement" signal, not just recency.

export interface TrendingSubstackPost {
  id: string;
  title: string;
  url: string;
  publication: string;
  author?: string;
  reactionCount: number;
  publishedAt: string;
  excerpt?: string;
}

interface RawPost {
  id: number;
  title: string;
  canonical_url: string;
  reaction_count: number | null;
  post_date: string;
  truncated_body_text?: string;
  publishedBylines?: { name: string }[];
}

async function fetchPostsFor(pub: SubstackPublication): Promise<TrendingSubstackPost[]> {
  const res = await fetch(`https://${pub.subdomain}.substack.com/api/v1/posts?limit=6`, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Substack posts fetch failed for ${pub.subdomain}: ${res.status}`);
  const posts: RawPost[] = await res.json();
  return posts.map((p): TrendingSubstackPost => ({
    id: `substack-trend-${pub.subdomain}-${p.id}`,
    title: p.title,
    url: p.canonical_url,
    publication: pub.name,
    author: p.publishedBylines?.[0]?.name,
    reactionCount: p.reaction_count ?? 0,
    publishedAt: p.post_date,
    excerpt: p.truncated_body_text?.slice(0, 200),
  }));
}

export async function fetchTrendingSubstackPosts(
  publications: SubstackPublication[],
  limit = 10
): Promise<TrendingSubstackPost[]> {
  const since = Date.now() - 7 * 86_400_000; // last 7 days, so newsletters posting weekly still show up
  const results = await Promise.allSettled(publications.map(fetchPostsFor));

  return results
    .filter((r): r is PromiseFulfilledResult<TrendingSubstackPost[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .filter((post) => new Date(post.publishedAt).getTime() >= since)
    .sort((a, b) => b.reactionCount - a.reactionCount)
    .slice(0, limit);
}
