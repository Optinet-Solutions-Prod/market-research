import type {
  Decision,
  RiskTier,
  ScoringWeights,
  Settings,
  Signals,
  Thresholds,
} from "@/lib/types";

/** 100-point model. Risk factors are inverted: low risk earns the points. */
export const DEFAULT_WEIGHTS: ScoringWeights = {
  commercial_demand: 20,
  serp_weakness: 20,
  affiliate_economics: 20,
  conversion_intent: 10,
  domain_quality: 5,
  competitor_diversity: 5,
  content_moat: 5,
  geo_expansion: 5,
  seo_risk: 5,
  legal_risk: 5,
};

export const DEFAULT_THRESHOLDS: Thresholds = {
  build_min_score: 75,
  review_min_score: 60,
  max_legal_risk: 45,
  max_seo_risk: 50,
  build_cost_eur: 1500,
  monthly_cost_eur: 250,
};

export const DEFAULT_SETTINGS: Settings = {
  weights: DEFAULT_WEIGHTS,
  thresholds: DEFAULT_THRESHOLDS,
};

export const SIGNAL_LABELS: Record<keyof Signals, string> = {
  commercial_demand: "Commercial demand",
  serp_weakness: "SERP weakness",
  affiliate_economics: "Affiliate economics",
  conversion_intent: "Conversion intent",
  domain_quality: "Domain quality",
  competitor_diversity: "Competitor diversity",
  content_moat: "Content moat",
  geo_expansion: "Geo expansion",
  seo_risk: "SEO safety",
  legal_risk: "Legal safety",
};

const INVERTED: (keyof Signals)[] = ["seo_risk", "legal_risk"];

export function score(signals: Signals, weights: ScoringWeights = DEFAULT_WEIGHTS) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  let sum = 0;
  for (const key of Object.keys(weights) as (keyof Signals)[]) {
    const raw = clamp(signals[key]);
    const value = INVERTED.includes(key) ? 100 - raw : raw;
    sum += value * weights[key];
  }
  return round1(sum / total);
}

export function riskTier(s: Pick<Signals, "seo_risk" | "legal_risk">): RiskTier {
  const r = Math.max(s.legal_risk, s.seo_risk);
  return r >= 60 ? "red" : r >= 35 ? "yellow" : "green";
}

export function decide(
  scoreValue: number,
  s: Pick<Signals, "seo_risk" | "legal_risk">,
  t: Thresholds = DEFAULT_THRESHOLDS,
): Decision {
  if (scoreValue >= t.build_min_score && s.legal_risk < t.max_legal_risk && s.seo_risk < t.max_seo_risk)
    return "BUILD";
  if (scoreValue >= t.review_min_score) return "REVIEW";
  return "SKIP";
}

/** Reasons an opportunity may not be handed to the build system. */
export function handoffBlockers(
  o: { score: number; legal_risk: number; seo_risk: number },
  t: Thresholds = DEFAULT_THRESHOLDS,
): string[] {
  const out: string[] = [];
  if (o.score < t.build_min_score) out.push(`score below ${t.build_min_score}`);
  if (o.legal_risk >= t.max_legal_risk) out.push("legal/trademark risk too high");
  if (o.seo_risk >= t.max_seo_risk) out.push("SEO/platform risk too high");
  return out;
}

export function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, Number.isFinite(n) ? n : 0));
}

export function round1(n: number) {
  return Math.round(n * 10) / 10;
}
