import Parser from "rss-parser";
import { DigestItem } from "../types";
import { categorize } from "../categorize";

const FEEDS = [
  { name: "One Useful Thing", url: "https://www.oneusefulthing.org/feed" },
  { name: "Latent Space", url: "https://www.latent.space/feed" },
  { name: "AI Supremacy", url: "https://www.aisupremacy.com/feed" },
  { name: "Import AI", url: "https://importai.substack.com/feed" },
  { name: "The Rundown AI", url: "https://www.therundown.ai/feed" },
];

const parser = new Parser();

export async function fetchSubstackDigest(): Promise<DigestItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      return (parsed.items ?? []).slice(0, 5).map((item, idx): DigestItem => {
        const text = `${item.title ?? ""} ${item.contentSnippet ?? ""}`;
        return {
          id: `substack-${feed.name}-${idx}-${item.guid ?? item.link ?? item.title}`,
          title: item.title ?? "(untitled)",
          url: item.link ?? "#",
          source: "Substack",
          sourceName: feed.name,
          author: item.creator ?? feed.name,
          snippet: item.contentSnippet?.slice(0, 220),
          publishedAt: item.isoDate ?? new Date().toISOString(),
          category: categorize(text),
        };
      });
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<DigestItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value);
}
