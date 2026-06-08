import { DigestItem } from "../types";
import { categorize } from "../categorize";

// Bluesky's AppView search API is free and public — no auth/app-password needed
// for read-only search. (Note: this sandbox's datacenter IP gets a 403 from
// Bluesky's edge CDN, same as Reddit — this should work fine from a normal
// residential connection or most hosting providers.)
const QUERIES = ["AI agent", "LLM", "prompt engineering", "open source AI", "Claude OR GPT"];

interface BskyPost {
  uri: string;
  author: { handle: string; displayName?: string };
  record: { text: string; createdAt: string };
  likeCount?: number;
  indexedAt: string;
}

export async function fetchBlueskyDigest(): Promise<DigestItem[]> {
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString();
  const results = await Promise.allSettled(
    QUERIES.map(async (query) => {
      const res = await fetch(
        `https://public.api.bsky.app/xrpc/app.bsky.feed.searchPosts?q=${encodeURIComponent(query)}&sort=top&since=${encodeURIComponent(since)}&limit=6`,
        { headers: { Accept: "application/json" } }
      );
      if (!res.ok) throw new Error(`Bluesky search failed for "${query}": ${res.status}`);
      const json = await res.json();
      const posts: BskyPost[] = json?.posts ?? [];
      return posts.map((post): DigestItem => {
        const rkey = post.uri.split("/").pop();
        return {
          id: `bsky-${post.uri}`,
          title: post.record.text.slice(0, 280),
          url: `https://bsky.app/profile/${post.author.handle}/post/${rkey}`,
          source: "Bluesky",
          sourceName: "Bluesky",
          author: `@${post.author.handle}`,
          score: post.likeCount,
          publishedAt: post.record.createdAt ?? post.indexedAt,
          category: categorize(post.record.text),
        };
      });
    })
  );

  const seen = new Set<string>();
  return results
    .filter((r): r is PromiseFulfilledResult<DigestItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}
