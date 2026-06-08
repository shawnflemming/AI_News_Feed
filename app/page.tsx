import { buildDigest, CATEGORIES } from "@/lib/digest";
import { fetchTopAISubstacks } from "@/lib/sources/substack-leaderboard";
import { fetchTrendingSubstackPosts } from "@/lib/sources/substack-trending";
import { fetchNewGithubRepos, fetchTrendingGithubRepos } from "@/lib/sources/github";
import DigestView from "./DigestView";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [digest, topSubstacks, newRepos, trendingRepos] = await Promise.all([
    buildDigest(),
    fetchTopAISubstacks(10),
    fetchNewGithubRepos().catch(() => []),
    fetchTrendingGithubRepos().catch(() => []),
  ]);
  const trendingPosts = await fetchTrendingSubstackPosts(topSubstacks, 10).catch(() => []);
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const total = CATEGORIES.reduce((sum, c) => sum + digest[c].length, 0);

  return (
    <DigestView
      today={today}
      total={total}
      categories={digest}
      trendingRepos={trendingRepos}
      newRepos={newRepos}
      topSubstacks={topSubstacks}
      trendingPosts={trendingPosts}
    />
  );
}
