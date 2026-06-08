import { DigestItem } from "../types";
import { categorize } from "../categorize";

// GitHub's public search API is free and keyless. We use it two ways:
//   - "new":      freshly-created AI repos (last 14 days), ranked by stars.
//   - "trending": AI repos from a wider window, ranked by stars-per-day — a
//                 keyless proxy for momentum, since the search API exposes no
//                 star history for true velocity.
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

function ageInDays(iso: string): number {
  return Math.max(1, (Date.now() - new Date(iso).getTime()) / 86_400_000);
}

async function searchRepos(qualifier: string): Promise<GHRepo[]> {
  const results = await Promise.allSettled(
    TOPICS.map(async (topic) => {
      const q = encodeURIComponent(`topic:${topic} ${qualifier}`);
      const res = await fetch(
        `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=10`,
        { headers: { Accept: "application/vnd.github+json" } }
      );
      if (!res.ok) throw new Error(`GitHub search failed for topic ${topic}: ${res.status}`);
      const json = await res.json();
      return (json?.items ?? []) as GHRepo[];
    })
  );

  const seen = new Set<number>();
  return results
    .filter((r): r is PromiseFulfilledResult<GHRepo[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .filter((repo) => (seen.has(repo.id) ? false : (seen.add(repo.id), true)));
}

function toItem(repo: GHRepo): DigestItem {
  const text = `${repo.full_name} ${repo.description ?? ""} ${repo.topics?.join(" ")}`;
  return {
    id: `gh-${repo.id}`,
    title: repo.full_name,
    url: repo.html_url,
    source: "GitHub",
    sourceName: repo.owner.login,
    author: repo.owner.login,
    score: repo.stargazers_count,
    velocity: Math.round(repo.stargazers_count / ageInDays(repo.created_at)),
    snippet: repo.description?.slice(0, 220) ?? undefined,
    publishedAt: repo.created_at,
    category: categorize(text),
  };
}

/** Freshly-created AI repos (last 14 days), ranked by raw star count. */
export async function fetchNewGithubRepos(limit = 12): Promise<DigestItem[]> {
  const repos = await searchRepos(`created:>${recentDateCutoff(14)}`);
  return repos
    .map(toItem)
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, limit);
}

/** AI repos gaining stars fastest, ranked by stars-per-day (velocity proxy). */
export async function fetchTrendingGithubRepos(limit = 12): Promise<DigestItem[]> {
  // Wider window + a star floor so the per-day rate is meaningful.
  const repos = await searchRepos(`created:>${recentDateCutoff(180)} stars:>100`);
  return repos
    .map(toItem)
    .sort((a, b) => (b.velocity ?? 0) - (a.velocity ?? 0))
    .slice(0, limit);
}
