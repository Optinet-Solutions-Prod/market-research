export type Intent =
  | "navigational"
  | "informational"
  | "commercial"
  | "comparison"
  | "transactional";

export type RiskTier = "green" | "yellow" | "red";
export type DomainRisk = "GREEN" | "YELLOW" | "RED";
export type Decision = "BUILD" | "REVIEW" | "SKIP";
export type OpportunityStatus = "NEW" | "APPROVED" | "REJECTED" | "HANDED_OFF";
export type ScanMode = "demo" | "live";

export type SerpKind =
  | "official"
  | "review_platform"
  | "ugc"
  | "video"
  | "publisher"
  | "affiliate"
  | "other";

export interface Industry {
  id: string;
  name: string;
  slug: string;
  regulated: boolean;
  default_conversion: number;
  active: boolean;
}

export interface Brand {
  id: string;
  industry_id: string;
  name: string;
  official_domain: string | null;
  geos: string[];
  active: boolean;
}

export interface AffiliateProgram {
  id: string;
  industry_id: string;
  brand_id: string | null;
  merchant: string;
  network: string;
  model: "CPA" | "CPL" | "REVSHARE" | "RECURRING";
  payout_eur: number;
  revshare_pct: number | null;
  avg_order_eur: number | null;
  recurring_months: number | null;
  cookie_days: number;
  conversion_rate: number | null;
  epc_eur: number | null;
  geos: string[];
  allows_brand_keywords: boolean;
  allows_competitor_comparison: boolean;
  notes: string | null;
}

export interface Keyword {
  brand_id: string;
  geo: string;
  keyword: string;
  intent: Intent;
  modifier: string | null;
  volume: number;
  cpc_eur: number | null;
  competition: number | null;
}

export interface SerpResult {
  brand_id: string;
  geo: string;
  keyword: string;
  position: number;
  url: string;
  domain: string;
  title: string | null;
  kind: SerpKind;
}

export interface Signals {
  commercial_demand: number;
  serp_weakness: number;
  affiliate_economics: number;
  conversion_intent: number;
  domain_quality: number;
  competitor_diversity: number;
  content_moat: number;
  geo_expansion: number;
  seo_risk: number;
  legal_risk: number;
}

export interface Economics {
  expected_rank: number;
  ctr: number;
  affiliate_click_rate: number;
  merchant_conversion: number;
  avg_commission: number;
  revenue_conservative: number;
  revenue_expected: number;
  revenue_aggressive: number;
  break_even_months: number | null;
}

export interface Rationale {
  highlights: string[];
  risks: string[];
  top_keywords: { keyword: string; volume: number; intent: Intent }[];
  competitors: string[];
  programs: { merchant: string; network: string; value_eur: number; model: string }[];
  site_structure: string[];
  seo_strategy: string[];
  budget: { build_eur: number; monthly_eur: number };
  funnel: {
    commercial_searches: number;
    visitors: number;
    affiliate_clicks: number;
    conversions: number;
  };
}

export interface Opportunity extends Signals, Economics {
  id: string;
  brand_id: string;
  scan_id: string | null;
  geo: string;
  industry: string;
  brand: string;
  theme: string;
  search_volume: number;
  commercial_volume: number;
  commercial_share: number;
  score: number;
  risk_tier: RiskTier;
  decision: Decision;
  status: OpportunityStatus;
  rationale: Rationale;
  updated_at: string;
}

export interface DomainCandidate {
  id?: string;
  opportunity_id?: string;
  domain: string;
  pattern: string;
  risk: DomainRisk;
  reason: string;
  quality: number;
  available: boolean | null;
  checked_at: string | null;
}

export interface Scan {
  id: string;
  mode: ScanMode;
  status: "running" | "done" | "failed";
  industries: string[];
  geo: string;
  brands_scanned: number;
  opportunities_found: number;
  log: string[];
  error: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface Handoff {
  id: string;
  opportunity_id: string;
  domain: string;
  status: "sent" | "failed" | "blocked" | "queued";
  payload: unknown;
  response: string | null;
  created_at: string;
}

export interface ScoringWeights {
  commercial_demand: number;
  serp_weakness: number;
  affiliate_economics: number;
  conversion_intent: number;
  domain_quality: number;
  competitor_diversity: number;
  content_moat: number;
  geo_expansion: number;
  seo_risk: number;
  legal_risk: number;
}

export interface Thresholds {
  build_min_score: number;
  review_min_score: number;
  max_legal_risk: number;
  max_seo_risk: number;
  build_cost_eur: number;
  monthly_cost_eur: number;
}

export interface Settings {
  weights: ScoringWeights;
  thresholds: Thresholds;
}

export interface OpportunityFilters {
  risk?: RiskTier;
  minScore?: number;
  decision?: Decision;
  industry?: string;
  q?: string;
}
