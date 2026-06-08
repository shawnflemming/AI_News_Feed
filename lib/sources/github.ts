import { DigestItem } from "../types";
import { categorize } from "../categorize";

// GitHub's public search API is free and keyless. We surface freshly-created
// repos tagged with AI-related topics, sorted by stars — a good signal for
// "cool things people are actively building with AI right now."
const TOPICS = ["ai", "llm", "agents", "machine-learning", "generative-ai"];

interface GHRepo {
  id: number;
  full_name: string;
  html_url: string;
  description: string | null;
  owner: { login: string };
  stargazers_count: number;
  created_at: string;
  topics: string[];
}

function recentDateCutoff(days: number): string {
  const d = new Date(Date.now() - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

export async function fetchGithubDigest(): Promise<DigestItem[]> {
  const since = recentDateCutoff(14);
  const results = await Promise.allSettled(
    TOPICS.map(async (topic) => {
      const q = encodeURIComponent(`topic:${topic} created:>${since}`);
      const res = await fetch(
        `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=6`,
        { headers: { Accept: "application/vnd.github+json" } }
      );
      if (!res.ok) throw new Error(`GitHub search failed for topic ${topic}: ${res.status}`);
      const json = await res.json();
      const repos: GHRepo[] = json?.items ?? [];
      return repos.map((repo): DigestItem => {
        const text = `${repo.full_name} ${repo.description ?? ""} ${repo.topics?.join(" ")}`;
        return {
          id: `gh-${repo.id}`,
          title: repo.full_name,
          url: repo.html_url,
          source: "GitHub",
          sourceName: `topic:${topic}`,
          author: repo.owner.login,
          score: repo.stargazers_count,
          snippet: repo.description?.slice(0, 220) ?? undefined,
          publishedAt: repo.created_at,
          category: categorize(text),
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
