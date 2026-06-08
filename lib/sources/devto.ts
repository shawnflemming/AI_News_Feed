import { Category, DigestItem } from "../types";
import { categorize } from "../categorize";

// Reddit's JSON endpoints hard-block most datacenter/cloud IPs (403 "blocked
// by network security"), which makes them unusable from a hosted server. DEV.to's
// public API is free, keyless, and a good proxy for "what the AI builder
// community is discussing right now."
// A tag may pin a category so topic tags always land in that section.
const TAGS: { tag: string; category?: Category }[] = [
  { tag: "ai" },
  { tag: "machinelearning" },
  { tag: "llm" },
  { tag: "openai" },
  { tag: "chatgpt" },
  { tag: "promptengineering", category: "Prompt Engineering" },
];

interface DevToArticle {
  id: number;
  title: string;
  url: string;
  description: string;
  user: { username: string };
  positive_reactions_count: number;
  published_at: string;
  tag_list: string[];
}

export async function fetchDevToDigest(): Promise<DigestItem[]> {
  const results = await Promise.allSettled(
    TAGS.map(async ({ tag, category }) => {
      const res = await fetch(`https://dev.to/api/articles?tag=${tag}&top=1&per_page=6`);
      if (!res.ok) throw new Error(`DEV.to fetch failed for tag ${tag}: ${res.status}`);
      const articles: DevToArticle[] = await res.json();
      return articles.map((a): DigestItem => ({
        id: `devto-${a.id}`,
        title: a.title,
        url: a.url,
        source: "DevTo",
        sourceName: `dev.to/t/${tag}`,
        author: `@${a.user.username}`,
        score: a.positive_reactions_count,
        snippet: a.description?.slice(0, 220),
        publishedAt: a.published_at,
        category: category ?? categorize(`${a.title} ${a.description ?? ""} ${a.tag_list?.join(" ")}`),
      }));
    })
  );

  const seen = new Set<string>();
  return results
    .filter((r): r is PromiseFulfilledResult<DigestItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .filter((item) => (seen.has(item.id) ? false : (seen.add(item.id), true)));
}
