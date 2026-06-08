import { buildDigest, CATEGORIES } from "@/lib/digest";
import { DigestItem, SourceType } from "@/lib/types";
import { fetchTopAISubstacks } from "@/lib/sources/substack-leaderboard";
import { fetchTrendingSubstackPosts } from "@/lib/sources/substack-trending";
import { fetchNewGithubRepos, fetchTrendingGithubRepos } from "@/lib/sources/github";

function formatStars(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function RepoSection({
  id,
  title,
  subtitle,
  repos,
  metric,
}: {
  id: string;
  title: string;
  subtitle: string;
  repos: DigestItem[];
  metric: "stars" | "velocity";
}) {
  return (
    <section id={id} className="scroll-mt-6">
      <h2 className="mb-1 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
        {title}
        <span className="ml-2 text-sm font-normal text-zinc-400">{repos.length}</span>
      </h2>
      <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{subtitle}</p>
      <div className="space-y-2">
        {repos.map((repo, idx) => (
          <a
            key={repo.id}
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
          >
            <span className="mt-0.5 font-mono text-sm text-zinc-400 dark:text-zinc-600">#{idx + 1}</span>
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                {repo.title}
              </h3>
              {repo.snippet && (
                <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500 dark:text-zinc-400">{repo.snippet}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {metric === "velocity" && typeof repo.velocity === "number" && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  +{formatStars(repo.velocity)}/day
                </span>
              )}
              {typeof repo.score === "number" && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                  ★ {formatStars(repo.score)}
                </span>
              )}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

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

function trendIndicator(item: DigestItem): string | null {
  if (typeof item.score !== "number") return null;
  if (item.score >= 200) return "🔥🔥 trending";
  if (item.score >= 50) return "🔥 rising";
  return `▲ ${item.score}`;
}

function ItemRow({ item }: { item: DigestItem }) {
  const trend = trendIndicator(item);
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border border-zinc-200 p-3 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium leading-snug text-zinc-900 dark:text-zinc-100">{item.title}</h3>
        {trend && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {trend}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
        <span>{timeAgo(item.publishedAt)}</span>
        {item.snippet && <span className="truncate">· {item.snippet}</span>}
      </div>
    </a>
  );
}

function SourceGroup({ items }: { items: DigestItem[] }) {
  const sourceType = items[0].source;
  const sourceName = items[0].sourceName;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_STYLES[sourceType]}`}>
          {sourceType}
        </span>
        <h4 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{sourceName}</h4>
        <span className="text-xs text-zinc-400">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

function groupBySource(items: DigestItem[]): DigestItem[][] {
  const map = new Map<string, DigestItem[]>();
  for (const item of items) {
    const key = `${item.source}::${item.sourceName}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.values());
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

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

  const navSections = [
    ...CATEGORIES.filter((c) => digest[c].length > 0),
    ...(trendingRepos.length > 0 ? ["Trending GitHub Repos"] : []),
    ...(newRepos.length > 0 ? ["New GitHub Repos"] : []),
    ...(topSubstacks.length > 0 ? ["Top AI Substacks"] : []),
    ...(trendingPosts.length > 0 ? ["Trending Substack Posts"] : []),
  ];

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black lg:flex">
      <nav className="shrink-0 border-b border-zinc-200 px-6 py-6 dark:border-zinc-800 lg:sticky lg:top-0 lg:h-screen lg:w-56 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Sections
        </h2>
        <ul className="space-y-1">
          {navSections.map((name) => (
            <li key={name}>
              <a
                href={`#${slugify(name)}`}
                className="block rounded-md px-2 py-1 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              >
                {name}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <main className="mx-auto max-w-5xl flex-1 px-6 py-12">
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
              <section key={category} id={slugify(category)} className="scroll-mt-6">
                <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                  {category}
                  <span className="ml-2 text-sm font-normal text-zinc-400">{items.length}</span>
                </h2>
                <div className="space-y-6">
                  {groupBySource(items).map((group) => (
                    <SourceGroup key={`${group[0].source}::${group[0].sourceName}`} items={group} />
                  ))}
                </div>
              </section>
            );
          })}

          {trendingRepos.length > 0 && (
            <RepoSection
              id={slugify("Trending GitHub Repos")}
              title="Trending GitHub Repos"
              subtitle="AI repos gaining stars fastest, ranked by stars per day"
              repos={trendingRepos}
              metric="velocity"
            />
          )}

          {newRepos.length > 0 && (
            <RepoSection
              id={slugify("New GitHub Repos")}
              title="New GitHub Repos"
              subtitle="Freshly-created AI repos from the last 14 days, ranked by stars"
              repos={newRepos}
              metric="stars"
            />
          )}

          {topSubstacks.length > 0 && (
            <section id={slugify("Top AI Substacks")} className="scroll-mt-6">
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
            <section id={slugify("Trending Substack Posts")} className="scroll-mt-6">
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
