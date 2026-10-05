import type { SerpKind, SerpResult } from "@/lib/types";

/** High-authority review/comparison platforms that are hard to outrank. */
const REVIEW_PLATFORMS = [
  "g2.com", "capterra.com", "trustpilot.com", "getapp.com", "softwareadvice.com", "trustradius.com",
  "pcmag.com", "techradar.com", "cnet.com", "zdnet.com", "tomsguide.com", "forbes.com",
  "nerdwallet.com", "investopedia.com", "bankrate.com", "wirecutter.com", "nytimes.com",
  "tripadvisor.com", "theverge.com", "wired.com", "businessinsider.com", "usnews.com",
];
const UGC = ["reddit.com", "quora.com", "stackexchange.com", "medium.com", "community."];
const VIDEO = ["youtube.com", "tiktok.com", "vimeo.com"];
const PUBLISHERS = ["wikipedia.org", "hubspot.com/blog", "shopify.com/blog", "nytimes.com", "theguardian.com"];

export function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
  }
}

export function classifySerpDomain(url: string, officialDomains: string[]): SerpKind {
  const host = hostOf(url);
  const full = url.toLowerCase();
  if (officialDomains.some((d) => d && (host === d || host.endsWith(`.${d}`)))) return "official";
  if (VIDEO.some((d) => host.endsWith(d))) return "video";
  if (UGC.some((d) => host.endsWith(d) || host.startsWith(d))) return "ugc";
  if (REVIEW_PLATFORMS.some((d) => host.endsWith(d))) return "review_platform";
  if (PUBLISHERS.some((d) => full.includes(d))) return "publisher";
  if (/(best|top|review|compare|vs|alternative)/.test(host)) return "affiliate";
  return "other";
}

/** How much each kind of result "defends" its slot (0 = easy to displace, 1 = very hard). */
const STRENGTH: Record<SerpKind, number> = {
  official: 0.95,
  review_platform: 0.85,
  publisher: 0.7,
  affiliate: 0.45,
  video: 0.35,
  ugc: 0.25, // Reddit/Quora in a commercial SERP signals a content gap
  other: 0.4,
};

/** Position weight — the top slots matter most for CTR. */
const POS_WEIGHT = [1, 0.9, 0.8, 0.65, 0.55, 0.45, 0.35, 0.3, 0.25, 0.2];

/**
 * 0-100 weakness for a single SERP. Considers who ranks and whether titles
 * actually target the query (exact targeting = stronger competition).
 */
export function serpWeakness(results: SerpResult[], keyword: string) {
  const top = [...results].sort((a, b) => a.position - b.position).slice(0, 10);
  if (top.length === 0) return 60;
  const terms = keyword.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  let strength = 0;
  let weight = 0;
  for (const r of top) {
    const w = POS_WEIGHT[r.position - 1] ?? 0.15;
    const title = (r.title ?? "").toLowerCase();
    const targeting = terms.length ? terms.filter((t) => title.includes(t)).length / terms.length : 0.5;
    const s = STRENGTH[r.kind] * (0.75 + 0.25 * targeting);
    strength += s * w;
    weight += w;
  }
  return Math.round(100 * (1 - strength / weight));
}

export function serpMix(results: SerpResult[]) {
  const mix: Partial<Record<SerpKind, number>> = {};
  for (const r of results) mix[r.kind] = (mix[r.kind] ?? 0) + 1;
  return mix;
}
