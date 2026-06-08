"use client";

import { useMemo, useState } from "react";
import { Category, DigestItem, SourceType } from "@/lib/types";
import { SubstackPublication } from "@/lib/sources/substack-leaderboard";
import { TrendingSubstackPost } from "@/lib/sources/substack-trending";

const SOURCE_META: Record<SourceType, { label: string; badge: string }> = {
  HackerNews: { label: "Hacker News", badge: "text-orange-400 border-orange-500/40 bg-orange-500/10" },
  GitHub: { label: "GitHub", badge: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" },
  DevTo: { label: "dev.to", badge: "text-violet-400 border-violet-500/40 bg-violet-500/10" },
  Substack: { label: "Substack", badge: "text-sky-400 border-sky-500/40 bg-sky-500/10" },
  Bluesky: { label: "Bluesky", badge: "text-blue-400 border-blue-500/40 bg-blue-500/10" },
};

const SOURCE_ORDER: SourceType[] = ["HackerNews", "GitHub", "DevTo", "Substack", "Bluesky"];

function timeAgo(iso: string): string {
  const hours = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function pointsColor(score?: number): string {
  if (typeof score !== "number") return "text-zinc-600";
  if (score >= 200) return "text-orange-400";
  if (score >= 50) return "text-amber-500";
  return "text-zinc-500";
}

function SourceBadge({ source }: { source: SourceType }) {
  const meta = SOURCE_META[source];
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
      {meta.label}
    </span>
  );
}

/** A ranked story row: big points number on the left, title + meta on the right. */
function Row({
  url,
  points,
  pointsLabel,
  title,
  meta,
}: {
  url: string;
  points?: number;
  pointsLabel: string;
  title: string;
  meta: React.ReactNode;
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-4 border-b border-zinc-800/80 py-5"
    >
      <div className="w-12 shrink-0 text-right">
        <div className={`text-2xl font-bold leading-none ${pointsColor(points)}`}>
          {typeof points === "number" ? formatNum(points) : "·"}
        </div>
        <div className="mt-1 text-[10px] uppercase tracking-wider text-zinc-600">{pointsLabel}</div>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold leading-snug text-zinc-100 transition-colors group-hover:text-white">
          {title}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">{meta}</div>
      </div>
    </a>
  );
}

function SectionHeading({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-2 flex items-center gap-3 pt-2">
      <span className="h-5 w-1 rounded bg-amber-500" />
      <h2 className="text-sm font-bold uppercase tracking-wider text-amber-500">{label}</h2>
      <span className="text-sm text-zinc-600">{count}</span>
    </div>
  );
}

type TabKey = Category | "GitHub" | "Substacks";

const CATEGORY_TAB_LABELS: Partial<Record<Category, string>> = {
  "Tips & Tutorials": "Tutorials",
  "Research & News": "Research",
  "Prompt Engineering": "Prompt Eng",
  "Context Engineering": "Context Eng",
};

export default function DigestView({
  today,
  categories,
  trendingRepos,
  newRepos,
  topSubstacks,
  trendingPosts,
}: {
  today: string;
  categories: Record<Category, DigestItem[]>;
  trendingRepos: DigestItem[];
  newRepos: DigestItem[];
  topSubstacks: SubstackPublication[];
  trendingPosts: TrendingSubstackPost[];
}) {
  const newsCategories = (Object.keys(categories) as Category[]).filter(
    (c) => categories[c].length > 0
  );
  const hasGithub = trendingRepos.length > 0 || newRepos.length > 0;
  const hasSubstacks = topSubstacks.length > 0 || trendingPosts.length > 0;

  const tabs: { key: TabKey; label: string }[] = [
    ...newsCategories.map((c) => ({
      key: c as TabKey,
      label: CATEGORY_TAB_LABELS[c] ?? c,
    })),
    ...(hasGithub ? [{ key: "GitHub" as TabKey, label: "GitHub" }] : []),
    ...(hasSubstacks ? [{ key: "Substacks" as TabKey, label: "Substacks" }] : []),
  ];

  const [activeTab, setActiveTab] = useState<TabKey>(tabs[0]?.key ?? "Tools & Products");
  const [sourceFilter, setSourceFilter] = useState<Set<SourceType>>(new Set());

  // Sources that actually appear in the news categories (for the filter row).
  const availableSources = useMemo(() => {
    const present = new Set<SourceType>();
    for (const c of newsCategories) for (const item of categories[c]) present.add(item.source);
    return SOURCE_ORDER.filter((s) => present.has(s));
  }, [categories, newsCategories]);

  function toggleSource(s: SourceType) {
    setSourceFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  }

  const sourceActive = (s: SourceType) => sourceFilter.size === 0 || sourceFilter.has(s);
  const passesFilter = (item: DigestItem) => sourceFilter.size === 0 || sourceFilter.has(item.source);

  const isNewsTab = newsCategories.includes(activeTab as Category);

  return (
    <div className="min-h-screen bg-black font-sans text-zinc-200">
      <div className="mx-auto max-w-3xl px-5 py-10">
        {/* Header */}
        <header className="mb-6">
          <h1
            className="text-5xl font-bold tracking-tight text-zinc-50"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            AI Digest
            <span className="ml-3 align-middle text-base font-normal text-zinc-500">({today})</span>
          </h1>
        </header>

        {/* Source filter badges */}
        {availableSources.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-2 border-b border-zinc-800 pb-6">
            {availableSources.map((s) => (
              <button
                key={s}
                onClick={() => toggleSource(s)}
                className={`rounded-md border px-3 py-1.5 text-sm font-semibold transition-opacity ${SOURCE_META[s].badge} ${
                  sourceActive(s) ? "opacity-100" : "opacity-40"
                }`}
              >
                {SOURCE_META[s].label}
              </button>
            ))}
          </div>
        )}

        {/* Tabs */}
        <nav className="mb-2 flex gap-6 border-b border-zinc-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`-mb-px border-b-2 pb-3 text-base font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-amber-500 text-amber-500"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div>
          {isNewsTab &&
            (() => {
              const items = categories[activeTab as Category].filter(passesFilter);
              return (
                <>
                  <SectionHeading label={String(activeTab)} count={items.length} />
                  {items.length === 0 ? (
                    <p className="py-8 text-sm text-zinc-600">No stories match the selected sources.</p>
                  ) : (
                    items.map((item) => (
                      <Row
                        key={item.id}
                        url={item.url}
                        points={item.score}
                        pointsLabel="pts"
                        title={item.title}
                        meta={
                          <>
                            <SourceBadge source={item.source} />
                            <span>{timeAgo(item.publishedAt)}</span>
                          </>
                        }
                      />
                    ))
                  )}
                </>
              );
            })()}

          {activeTab === "GitHub" && (
            <>
              {trendingRepos.length > 0 && (
                <>
                  <SectionHeading label="Trending Repos" count={trendingRepos.length} />
                  {trendingRepos.map((repo) => (
                    <Row
                      key={repo.id}
                      url={repo.url}
                      points={repo.score}
                      pointsLabel="stars"
                      title={repo.title}
                      meta={
                        <>
                          <SourceBadge source="GitHub" />
                          {typeof repo.score === "number" && (
                            <span className="text-amber-400">★ {formatNum(repo.score)}</span>
                          )}
                          {typeof repo.velocity === "number" && (
                            <span className="text-amber-500">+{formatNum(repo.velocity)}/day</span>
                          )}
                          <span>{timeAgo(repo.publishedAt)}</span>
                        </>
                      }
                    />
                  ))}
                </>
              )}
              {newRepos.length > 0 && (
                <>
                  <SectionHeading label="New Repos" count={newRepos.length} />
                  {newRepos.map((repo) => (
                    <Row
                      key={repo.id}
                      url={repo.url}
                      points={repo.score}
                      pointsLabel="stars"
                      title={repo.title}
                      meta={
                        <>
                          <SourceBadge source="GitHub" />
                          {typeof repo.score === "number" && (
                            <span className="text-amber-400">★ {formatNum(repo.score)}</span>
                          )}
                          <span>{timeAgo(repo.publishedAt)}</span>
                        </>
                      }
                    />
                  ))}
                </>
              )}
            </>
          )}

          {activeTab === "Substacks" && (
            <>
              {topSubstacks.length > 0 && (
                <>
                  <SectionHeading label="Top AI Substacks" count={topSubstacks.length} />
                  {topSubstacks.map((pub, idx) => (
                    <Row
                      key={pub.subdomain}
                      url={pub.url}
                      points={idx + 1}
                      pointsLabel="rank"
                      title={pub.name}
                      meta={
                        <>
                          <SourceBadge source="Substack" />
                          {pub.subscriberLabel && <span>{pub.subscriberLabel}</span>}
                        </>
                      }
                    />
                  ))}
                </>
              )}
              {trendingPosts.length > 0 && (
                <>
                  <SectionHeading label="Trending Posts" count={trendingPosts.length} />
                  {trendingPosts.map((post) => (
                    <Row
                      key={post.id}
                      url={post.url}
                      points={post.reactionCount}
                      pointsLabel="♥"
                      title={post.title}
                      meta={
                        <>
                          <SourceBadge source="Substack" />
                          <span>{post.publication}</span>
                          <span>{timeAgo(post.publishedAt)}</span>
                        </>
                      }
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
