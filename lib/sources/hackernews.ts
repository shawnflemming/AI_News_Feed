import { Category, DigestItem } from "../types";
import { categorize } from "../categorize";

// X/Twitter's API requires a paid key, and public Nitter mirrors have gone
// dark/unreliable, so we use Hacker News' free Algolia search API filtered to
// AI topics as a stand-in for "what tech Twitter is buzzing about."
// A query may pin a category so topic searches always land in that section.
const QUERIES: { q: string; category?: Category }[] = [
  { q: "AI agent" },
  { q: "LLM" },
  { q: "OpenAI" },
  { q: "Claude" },
  { q: "Gemini" },
  { q: "prompt engineering", category: "Prompt Engineering" },
  { q: "context engineering", category: "Context Engineering" },
];

interface HNHit {
  objectID: string;
  title: string | null;
  url: string | null;
  author: string;
  points: number;
  created_at: string;
  story_text: string | null;
}

export async function fetchHackerNewsDigest(): Promise<DigestItem[]> {
  const results = await Promise.allSettled(
    QUERIES.map(async ({ q, category }) => {
      const res = await fetch(
        `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&numericFilters=created_at_i>${Math.floor(Date.now() / 1000) - 86400}`
      );
      if (!res.ok) throw new Error(`HN search failed for "${q}": ${res.status}`);
      const json = await res.json();
      const hits: HNHit[] = json?.hits ?? [];
      return hits.slice(0, 4).map((hit): DigestItem => {
        const text = `${hit.title ?? ""} ${hit.story_text ?? ""}`;
        return {
          id: `hn-${hit.objectID}`,
          title: hit.title ?? "(untitled)",
          url: hit.url ?? `https://news.ycombinator.com/item?id=${hit.objectID}`,
          source: "HackerNews",
          sourceName: "Hacker News",
          author: hit.author,
          score: hit.points,
          snippet: hit.story_text?.slice(0, 220),
          publishedAt: hit.created_at,
          category: category ?? categorize(text),
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
