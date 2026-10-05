import type { KeywordProvider, SerpProvider, SerpRow, VolumeRow } from "./types";

/**
 * DataForSEO v3 — https://docs.dataforseo.com/v3/
 * Env: DATAFORSEO_LOGIN, DATAFORSEO_PASSWORD
 */

const BASE = "https://api.dataforseo.com/v3";

export const LOCATIONS: Record<string, { location_code: number; language_code: string }> = {
  US: { location_code: 2840, language_code: "en" },
  UK: { location_code: 2826, language_code: "en" },
  CA: { location_code: 2124, language_code: "en" },
  AU: { location_code: 2036, language_code: "en" },
  DE: { location_code: 2276, language_code: "de" },
  FR: { location_code: 2250, language_code: "fr" },
  NL: { location_code: 2528, language_code: "nl" },
  ES: { location_code: 2724, language_code: "es" },
  IT: { location_code: 2380, language_code: "it" },
};

export function dataForSeoConfigured() {
  return Boolean(process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD);
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const auth = Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString("base64");
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`DataForSEO ${path} → HTTP ${res.status}`);
  const json = await res.json();
  if (json.status_code !== 20000) throw new Error(`DataForSEO ${path} → ${json.status_message}`);
  const task = json.tasks?.[0];
  if (task?.status_code !== 20000) throw new Error(`DataForSEO task → ${task?.status_message ?? "unknown error"}`);
  return task.result as T;
}

function loc(geo: string) {
  return LOCATIONS[geo] ?? LOCATIONS.US;
}

/** Google Ads search volume, batched up to 1,000 keywords per request. */
export const dataForSeoKeywords: KeywordProvider = {
  name: "dataforseo",
  async getVolumes(keywords, geo) {
    const out: VolumeRow[] = [];
    // Google Ads rejects some punctuation; keep keywords plain
    const clean = [...new Set(keywords.map((k) => k.replace(/[^\p{L}\p{N}\s.'-]/gu, " ").replace(/\s+/g, " ").trim()))];
    for (let i = 0; i < clean.length; i += 1000) {
      type Row = { keyword: string; search_volume: number | null; cpc: number | null; competition_index: number | null };
      const rows = await post<Row[] | null>("/keywords_data/google_ads/search_volume/live", [
        { keywords: clean.slice(i, i + 1000), ...loc(geo) },
      ]);
      for (const r of rows ?? []) {
        out.push({
          keyword: r.keyword,
          volume: r.search_volume ?? 0,
          // DataForSEO reports CPC in USD; close enough for ranking purposes
          cpc_eur: r.cpc,
          competition: r.competition_index != null ? r.competition_index / 100 : null,
        });
      }
    }
    return out;
  },
};

export const dataForSeoSerp: SerpProvider = {
  name: "dataforseo",
  async getSerp(keyword, geo) {
    type Item = { type: string; rank_group: number; url: string; title: string | null };
    const result = await post<{ items: Item[] | null }[] | null>("/serp/google/organic/live/regular", [
      { keyword, depth: 10, ...loc(geo) },
    ]);
    const items = result?.[0]?.items ?? [];
    return items
      .filter((i) => i.type === "organic")
      .slice(0, 10)
      .map((i): SerpRow => ({ position: i.rank_group, url: i.url, title: i.title }));
  },
};
