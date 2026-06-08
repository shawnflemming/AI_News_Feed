// Substack exposes its Discover leaderboards via a public (undocumented) JSON
// endpoint — the same data backing https://substack.com/discover. We pull the
// Technology category leaderboard and filter to AI-relevant newsletters by
// keyword, then rank by real subscriber counts. No auth, no curated seed list.
//
// Note: undocumented endpoint — could change or get rate-limited without notice.

const TECH_CATEGORY_ID = 4;
const AI_KEYWORDS = /\bai\b|artificial intelligence|machine learning|\bllm\b|\bgpt\b|openai|generative ai|\bagents?\b/i;

export interface SubstackPublication {
  subdomain: string;
  name: string;
  url: string;
  description: string | null;
  subscriberLabel: string | null;
  freeSubscriberCount: number | null;
  logoUrl: string | null;
}

interface RawPublication {
  subdomain: string;
  custom_domain: string | null;
  name: string;
  hero_text: string | null;
  rankingDetailFreeSubscriberCount: string | null;
  freeSubscriberCount: number | string | null;
  logo_url: string | null;
}

function parseSubCount(raw: number | string | null): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return raw;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function fetchTopAISubstacks(limit = 10): Promise<SubstackPublication[]> {
  const res = await fetch(`https://substack.com/api/v1/category/public/${TECH_CATEGORY_ID}/top?page=0`, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Substack leaderboard fetch failed: ${res.status}`);
  const json = await res.json();
  const pubs: RawPublication[] = json?.publications ?? [];

  return pubs
    .filter((p) => AI_KEYWORDS.test(`${p.name ?? ""} ${p.hero_text ?? ""}`))
    .map((p): SubstackPublication => ({
      subdomain: p.subdomain,
      name: p.name,
      url: p.custom_domain ? `https://${p.custom_domain}` : `https://${p.subdomain}.substack.com`,
      description: p.hero_text,
      subscriberLabel: p.rankingDetailFreeSubscriberCount,
      freeSubscriberCount: parseSubCount(p.freeSubscriberCount),
      logoUrl: p.logo_url,
    }))
    .sort((a, b) => (b.freeSubscriberCount ?? 0) - (a.freeSubscriberCount ?? 0))
    .slice(0, limit);
}
