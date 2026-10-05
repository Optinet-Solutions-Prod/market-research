import type {
  AffiliateProgram,
  Brand,
  DomainCandidate,
  Handoff,
  Industry,
  Keyword,
  Opportunity,
  OpportunityFilters,
  OpportunityStatus,
  Scan,
  SerpResult,
  Settings,
} from "@/lib/types";

export type NewOpportunity = Omit<Opportunity, "id" | "status" | "updated_at">;
export type Upsert<T extends { id: string }> = Omit<T, "id"> & { id?: string };

export interface Store {
  kind: "supabase" | "memory";

  listIndustries(): Promise<Industry[]>;
  upsertIndustry(i: Upsert<Industry>): Promise<Industry>;
  listBrands(industryId?: string): Promise<Brand[]>;
  upsertBrand(b: Upsert<Brand>): Promise<Brand>;
  deleteBrand(id: string): Promise<void>;
  listPrograms(industryId?: string): Promise<AffiliateProgram[]>;
  upsertProgram(p: Upsert<AffiliateProgram>): Promise<AffiliateProgram>;
  deleteProgram(id: string): Promise<void>;

  saveKeywords(brandId: string, geo: string, rows: Keyword[]): Promise<void>;
  listKeywords(brandId: string, geo: string): Promise<Keyword[]>;
  saveSerp(brandId: string, geo: string, rows: SerpResult[]): Promise<void>;
  listSerp(brandId: string, geo: string): Promise<SerpResult[]>;

  /** Upsert by (brand_id, geo); keeps existing status. */
  upsertOpportunity(o: NewOpportunity): Promise<Opportunity>;
  listOpportunities(f?: OpportunityFilters): Promise<Opportunity[]>;
  getOpportunity(id: string): Promise<Opportunity | null>;
  setOpportunityStatus(id: string, status: OpportunityStatus): Promise<void>;
  replaceDomains(opportunityId: string, domains: DomainCandidate[]): Promise<void>;
  listDomains(opportunityId: string): Promise<DomainCandidate[]>;

  createScan(s: Pick<Scan, "mode" | "industries" | "geo">): Promise<Scan>;
  updateScan(id: string, patch: Partial<Scan>): Promise<void>;
  getScan(id: string): Promise<Scan | null>;
  listScans(limit?: number): Promise<Scan[]>;

  createHandoff(h: Omit<Handoff, "id" | "created_at">): Promise<Handoff>;
  listHandoffs(limit?: number): Promise<Handoff[]>;

  getSettings(): Promise<Settings>;
  saveSettings(s: Settings): Promise<void>;
}

export function matchesFilters(o: Opportunity, f: OpportunityFilters = {}) {
  if (f.risk && o.risk_tier !== f.risk) return false;
  if (f.minScore != null && o.score < f.minScore) return false;
  if (f.decision && o.decision !== f.decision) return false;
  if (f.industry && o.industry !== f.industry) return false;
  if (f.q) {
    const hay = `${o.industry} ${o.brand} ${o.theme}`.toLowerCase();
    if (!hay.includes(f.q.toLowerCase())) return false;
  }
  return true;
}
