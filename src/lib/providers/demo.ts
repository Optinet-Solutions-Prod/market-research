import type { DomainProvider, KeywordProvider, SerpProvider, SerpRow, VolumeRow } from "./types";

/**
 * Deterministic synthetic market data so the full pipeline can run without API
 * keys. Same input → same output, so demo scans are stable between runs.
 */

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

const range = (seed: string, lo: number, hi: number) => lo + hash(seed) * (hi - lo);

const SHARE: Record<string, [number, number]> = {
  login: [0.08, 0.2],
  pricing: [0.03, 0.08],
  review: [0.015, 0.04],
  reviews: [0.01, 0.03],
  "worth it": [0.002, 0.008],
  "for small business": [0.002, 0.01],
  alternatives: [0.02, 0.07],
  competitors: [0.006, 0.02],
  "best alternative": [0.002, 0.008],
  "cheaper than": [0.0005, 0.003],
  cancel: [0.004, 0.02],
  discount: [0.004, 0.02],
  coupon: [0.003, 0.015],
  "free trial": [0.003, 0.012],
  "how to use": [0.003, 0.012],
  vs: [0.002, 0.012],
};

const GEO_FACTOR: Record<string, number> = { US: 1, UK: 0.32, DE: 0.28, FR: 0.2, CA: 0.14, AU: 0.12, NL: 0.07, ES: 0.15, IT: 0.13 };

export const demoKeywords: KeywordProvider = {
  name: "demo",
  async getVolumes(keywords, geo) {
    const g = GEO_FACTOR[geo] ?? 0.1;
    return keywords.map((kw): VolumeRow => {
      const { brand, mod } = parseKeyword(kw);
      // Skewed so most brands are mid-size and a few are huge
      const core = Math.round((2500 + hash(`core:${brand}`) ** 2.2 * 160000) * g);
      const share = mod ? range(`share:${kw}`, ...SHARE[mod]) : 1;
      const volume = roundVolume(core * share);
      return {
        keyword: kw,
        volume,
        cpc_eur: Math.round(range(`cpc:${kw}`, 0.4, 14) * 100) / 100,
        competition: Math.round(range(`comp:${kw}`, 0.1, 0.95) * 100) / 100,
      };
    });
  },
};

const PREFIX_MODS: [string, string][] = [
  ["best alternative to ", "best alternative"],
  ["cheaper than ", "cheaper than"],
  ["how to use ", "how to use"],
  ["cancel ", "cancel"],
  ["is ", "worth it"],
];
// Longest first so "reviews" wins over "review"
const SUFFIX_MODS = Object.keys(SHARE).sort((a, b) => b.length - a.length);

function parseKeyword(kw: string): { brand: string; mod: string | null } {
  for (const [prefix, mod] of PREFIX_MODS) {
    if (kw.startsWith(prefix)) return { brand: kw.slice(prefix.length).replace(/ worth it$/, ""), mod };
  }
  if (kw.includes(" vs ")) return { brand: kw.split(" vs ")[0], mod: "vs" };
  const mod = SUFFIX_MODS.find((m) => kw.endsWith(` ${m}`));
  return mod ? { brand: kw.slice(0, -(mod.length + 1)), mod } : { brand: kw, mod: null };
}

/** Google Ads-style bucketed volumes. */
function roundVolume(v: number) {
  if (v < 10) return 0;
  const buckets = [10, 20, 30, 40, 50, 70, 90, 110, 140, 170, 210, 260, 320, 390, 480, 590, 720, 880, 1000, 1300, 1600, 1900, 2400, 2900, 3600, 4400, 5400, 6600, 8100, 9900, 12100, 14800, 18100, 22200, 27100, 33100, 40500, 49500, 60500, 74000, 90500, 110000, 135000, 165000, 201000, 246000];
  return buckets.reduce((best, b) => (Math.abs(b - v) < Math.abs(best - v) ? b : best), buckets[0]);
}

const STRONG = [
  { host: "g2.com", title: (k: string) => `Top ${cap(k)} in 2026 | G2` },
  { host: "capterra.com", title: (k: string) => `${cap(k)} | Capterra` },
  { host: "techradar.com", title: (k: string) => `Best ${k} tested and rated` },
  { host: "forbes.com", title: (k: string) => `${cap(k)}: Forbes Advisor` },
  { host: "trustpilot.com", title: (k: string) => `${cap(k)} reviews | Trustpilot` },
  { host: "pcmag.com", title: (k: string) => `${cap(k)} review | PCMag` },
];
const WEAK = [
  { host: "reddit.com", title: (k: string) => `${k}? : r/smallbusiness` },
  { host: "youtube.com", title: (k: string) => `${cap(k)} (honest take)` },
  { host: "quora.com", title: (k: string) => `What are good ${k}?` },
  { host: "medium.com", title: () => `My experience switching tools` },
  { host: "smallbizdaily.com", title: () => `Software roundup` },
  { host: "bestpickreviews.net", title: (k: string) => `${cap(k)} compared` },
  { host: "toolcompare.io", title: () => `Side-by-side tool comparisons` },
  { host: "startupstack.blog", title: () => `Our favourite tools this year` },
];

/** Each brand gets a stable "softness": how often weak results fill its commercial SERPs. */
export function demoSerpFor(officialDomain: string | null): SerpProvider {
  const softness = 0.15 + 0.75 * hash(`soft:${officialDomain ?? "none"}`);
  return {
    name: "demo",
    async getSerp(keyword) {
      const rows: SerpRow[] = [];
      const ownsTop = officialDomain && hash(`own:${keyword}`) < (keyword.includes("pricing") ? 0.9 : 0.35);
      if (ownsTop) rows.push({ position: 1, url: `https://${officialDomain}/`, title: keyword });
      const strong = [...STRONG].sort((a, b) => hash(`${keyword}:${a.host}`) - hash(`${keyword}:${b.host}`));
      const weak = [...WEAK].sort((a, b) => hash(`${keyword}:${a.host}`) - hash(`${keyword}:${b.host}`));
      while (rows.length < 10 && (strong.length || weak.length)) {
        const pickWeak = weak.length && (!strong.length || hash(`slot:${keyword}:${rows.length}`) < softness);
        const f = (pickWeak ? weak : strong).shift()!;
        rows.push({ position: rows.length + 1, url: `https://${f.host}/${slug(keyword)}`, title: f.title(keyword) });
      }
      return rows;
    },
  };
}

export const demoDomains: DomainProvider = {
  name: "demo",
  async check(domains) {
    return new Map(domains.map((d) => [d, hash(`avail:${d}`) > 0.45]));
  },
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
