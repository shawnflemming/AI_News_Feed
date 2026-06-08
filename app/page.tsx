import { buildDigest, CATEGORIES } from "@/lib/digest";
import { DigestItem, SourceType } from "@/lib/types";
import { fetchTopAISubstacks } from "@/lib/sources/substack-leaderboard";
import { fetchTrendingSubstackPosts } from "@/lib/sources/substack-trending";

export const dynamic = "force-dynamic";

const SOURCE_STYLES: Record<SourceType, string> = {
  DevTo: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  Substack: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  HackerNews: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300",
  GitHub: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  Bluesky: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.floor(diffMs / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function ItemCard({ item }: { item: DigestItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
    >
      <div className="mb-2 flex items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-medium ${SOURCE_STYLES[item.source]}`}>
          {item.source}
        </span>
        <span className="text-zinc-500 dark:text-zinc-400">{item.sourceName}</span>
        <span className="text-zinc-400 dark:text-zinc-600">·</span>
        <span className="text-zinc-500 dark:text-zinc-400">{timeAgo(item.publishedAt)}</span>
        {typeof item.score === "number" && (
          <>
            <span className="text-zinc-400 dark:text-zinc-600">·</span>
            <span className="text-zinc-500 dark:text-zinc-400">▲ {item.score}</span>
          </>
        )}
      </div>
      <h3 className="font-medium leading-snug text-zinc-900 dark:text-zinc-100">{item.title}</h3>
      {item.snippet && (
        <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{item.snippet}</p>
      )}
    </a>
  );
}

export default async function Home() {
  const [digest, topSubstacks] = await Promise.all([buildDigest(), fetchTopAISubstacks(10)]);
  const trendingPosts = await fetchTrendingSubstackPosts(topSubstacks, 10).catch(() => []);
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const total = CATEGORIES.reduce((sum, c) => sum + digest[c].length, 0);

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <main className="mx-auto max-w-5xl px-6 py-12">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            AI Digest
          </h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            {today} · {total} stories curated from DEV.to, Substack, Hacker News, GitHub &amp; Bluesky
          </p>
        </header>

        <div className="space-y-12">
          {CATEGORIES.map((category) => {
            const items = digest[category];
            if (items.length === 0) return null;
            return (
              <section key={category}>
                <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {category}
                  <span className="ml-2 text-sm font-normal text-zinc-400">{items.length}</span>
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((item) => (
                    <ItemCard key={item.id} item={item} />
                  ))}
                </div>
              </section>
            );
          })}

          {topSubstacks.length > 0 && (
            <section>
              <h2 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Top AI Substacks
                <span className="ml-2 text-sm font-normal text-zinc-400">{topSubstacks.length}</span>
              </h2>
              <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                Ranked by subscriber count, via Substack&apos;s own Technology leaderboard
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {topSubstacks.map((pub, idx) => (
                  <a
                    key={pub.subdomain}
                    href={pub.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-mono text-zinc-400 dark:text-zinc-600">#{idx + 1}</span>
                      {pub.subscriberLabel && <span>{pub.subscriberLabel}</span>}
                    </div>
                    <h3 className="font-medium leading-snug text-zinc-900 dark:text-zinc-100">{pub.name}</h3>
                    {pub.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{pub.description}</p>
                    )}
                  </a>
                ))}
              </div>
            </section>
          )}

          {trendingPosts.length > 0 && (
            <section>
              <h2 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Trending Substack Posts
                <span className="ml-2 text-sm font-normal text-zinc-400">{trendingPosts.length}</span>
              </h2>
              <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                From the top AI Substacks above, ranked by reader reactions in the last 7 days
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {trendingPosts.map((post, idx) => (
                  <a
                    key={post.id}
                    href={post.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                  >
                    <div className="mb-1 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="font-mono text-zinc-400 dark:text-zinc-600">#{idx + 1}</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        {post.publication}
                      </span>
                      <span>♥ {post.reactionCount}</span>
                      <span>·</span>
                      <span>{timeAgo(post.publishedAt)}</span>
                    </div>
                    <h3 className="font-medium leading-snug text-zinc-900 dark:text-zinc-100">{post.title}</h3>
                    {post.excerpt && (
                      <p className="mt-1 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{post.excerpt}</p>
                    )}
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        {total === 0 && (
          <p className="text-center text-zinc-500 dark:text-zinc-400">
            No stories loaded — sources may be temporarily unreachable. Try refreshing.
          </p>
        )}
      </main>
    </div>
  );
}
