import type { Intent } from "@/lib/types";

export interface KeywordSeed {
  keyword: string;
  intent: Intent;
  modifier: string | null;
}

/** Modifiers that make up a brand's search ecosystem, grouped by intent. */
export const BRAND_MODIFIERS: { modifier: string | null; intent: Intent; template: (b: string) => string }[] = [
  { modifier: null, intent: "navigational", template: (b) => b },
  { modifier: "login", intent: "navigational", template: (b) => `${b} login` },
  { modifier: "pricing", intent: "commercial", template: (b) => `${b} pricing` },
  { modifier: "review", intent: "commercial", template: (b) => `${b} review` },
  { modifier: "reviews", intent: "commercial", template: (b) => `${b} reviews` },
  { modifier: "worth it", intent: "commercial", template: (b) => `is ${b} worth it` },
  { modifier: "for small business", intent: "commercial", template: (b) => `${b} for small business` },
  { modifier: "alternatives", intent: "comparison", template: (b) => `${b} alternatives` },
  { modifier: "competitors", intent: "comparison", template: (b) => `${b} competitors` },
  { modifier: "best alternative", intent: "comparison", template: (b) => `best alternative to ${b}` },
  { modifier: "cheaper than", intent: "comparison", template: (b) => `cheaper than ${b}` },
  { modifier: "cancel", intent: "transactional", template: (b) => `cancel ${b}` },
  { modifier: "discount", intent: "transactional", template: (b) => `${b} discount` },
  { modifier: "coupon", intent: "transactional", template: (b) => `${b} coupon` },
  { modifier: "free trial", intent: "transactional", template: (b) => `${b} free trial` },
  { modifier: "how to use", intent: "informational", template: (b) => `how to use ${b}` },
];

/** Monetisable intents — navigational/informational traffic is excluded from commercial demand. */
export const COMMERCIAL_INTENTS: Intent[] = ["commercial", "comparison", "transactional"];

/** Relative likelihood that a searcher with this intent clicks an affiliate offer. */
export const INTENT_VALUE: Record<Intent, number> = {
  navigational: 0.05,
  informational: 0.15,
  commercial: 0.6,
  comparison: 1,
  transactional: 0.85,
};

export function expandBrandKeywords(brand: string, competitors: string[], maxVs = 5): KeywordSeed[] {
  const b = brand.toLowerCase();
  const seeds: KeywordSeed[] = BRAND_MODIFIERS.map((m) => ({
    keyword: m.template(b),
    intent: m.intent,
    modifier: m.modifier,
  }));
  for (const c of competitors.slice(0, maxVs)) {
    seeds.push({ keyword: `${b} vs ${c.toLowerCase()}`, intent: "comparison", modifier: "vs" });
  }
  return dedupe(seeds);
}

function dedupe(seeds: KeywordSeed[]) {
  const seen = new Set<string>();
  return seeds.filter((s) => (seen.has(s.keyword) ? false : (seen.add(s.keyword), true)));
}
