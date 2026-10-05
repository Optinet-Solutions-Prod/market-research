import { DEFAULT_SETTINGS } from "@/lib/engine/scoring";
import type {
  AffiliateProgram,
  Brand,
  DomainCandidate,
  Handoff,
  Industry,
  Keyword,
  Opportunity,
  Scan,
  SerpResult,
  Settings,
} from "@/lib/types";
import { seedRows } from "./seed";
import { matchesFilters, type Store } from "./store";

/**
 * In-process store used when Supabase isn't configured. Data lives until the
 * server restarts — good for trying the app, not for production.
 */
interface State {
  industries: Industry[];
  brands: Brand[];
  programs: AffiliateProgram[];
  keywords: Map<string, Keyword[]>;
  serp: Map<string, SerpResult[]>;
  opportunities: Opportunity[];
  domains: Map<string, DomainCandidate[]>;
  scans: Scan[];
  handoffs: Handoff[];
  settings: Settings;
}

const g = globalThis as unknown as { __radarMemory?: State };

function state(): State {
  if (!g.__radarMemory) {
    const seed = seedRows(() => crypto.randomUUID());
    g.__radarMemory = {
      industries: seed.industries,
      brands: seed.brands,
      programs: seed.programs,
      keywords: new Map(),
      serp: new Map(),
      opportunities: [],
      domains: new Map(),
      scans: [],
      handoffs: [],
      settings: structuredClone(DEFAULT_SETTINGS),
    };
  }
  return g.__radarMemory;
}

function upsertById<T extends { id: string }>(list: T[], row: Omit<T, "id"> & { id?: string }): T {
  const id = row.id ?? crypto.randomUUID();
  const full = { ...row, id } as T;
  const i = list.findIndex((x) => x.id === id);
  if (i >= 0) list[i] = full;
  else list.push(full);
  return full;
}

const now = () => new Date().toISOString();

export const memoryStore: Store = {
  kind: "memory",

  async listIndustries() {
    return [...state().industries].sort((a, b) => a.name.localeCompare(b.name));
  },
  async upsertIndustry(i) {
    return upsertById(state().industries, i);
  },
  async listBrands(industryId) {
    return state().brands.filter((b) => !industryId || b.industry_id === industryId);
  },
  async upsertBrand(b) {
    return upsertById(state().brands, b);
  },
  async deleteBrand(id) {
    const s = state();
    s.brands = s.brands.filter((b) => b.id !== id);
    s.opportunities = s.opportunities.filter((o) => o.brand_id !== id);
  },
  async listPrograms(industryId) {
    return state().programs.filter((p) => !industryId || p.industry_id === industryId);
  },
  async upsertProgram(p) {
    return upsertById(state().programs, p);
  },
  async deleteProgram(id) {
    const s = state();
    s.programs = s.programs.filter((p) => p.id !== id);
  },

  async saveKeywords(brandId, geo, rows) {
    state().keywords.set(`${brandId}:${geo}`, rows);
  },
  async listKeywords(brandId, geo) {
    return state().keywords.get(`${brandId}:${geo}`) ?? [];
  },
  async saveSerp(brandId, geo, rows) {
    state().serp.set(`${brandId}:${geo}`, rows);
  },
  async listSerp(brandId, geo) {
    return state().serp.get(`${brandId}:${geo}`) ?? [];
  },

  async upsertOpportunity(o) {
    const s = state();
    const existing = s.opportunities.find((x) => x.brand_id === o.brand_id && x.geo === o.geo);
    const row: Opportunity = { ...o, id: existing?.id ?? crypto.randomUUID(), status: existing?.status ?? "NEW", updated_at: now() };
    if (existing) Object.assign(existing, row);
    else s.opportunities.push(row);
    return row;
  },
  async listOpportunities(f) {
    return state().opportunities.filter((o) => matchesFilters(o, f)).sort((a, b) => b.score - a.score);
  },
  async getOpportunity(id) {
    return state().opportunities.find((o) => o.id === id) ?? null;
  },
  async setOpportunityStatus(id, status) {
    const o = state().opportunities.find((x) => x.id === id);
    if (o) o.status = status;
  },
  async replaceDomains(opportunityId, domains) {
    state().domains.set(opportunityId, domains.map((d) => ({ ...d, id: d.id ?? crypto.randomUUID(), opportunity_id: opportunityId })));
  },
  async listDomains(opportunityId) {
    return state().domains.get(opportunityId) ?? [];
  },

  async createScan(s) {
    const scan: Scan = {
      ...s,
      id: crypto.randomUUID(),
      status: "running",
      brands_scanned: 0,
      opportunities_found: 0,
      log: [],
      error: null,
      started_at: now(),
      finished_at: null,
    };
    state().scans.unshift(scan);
    return scan;
  },
  async updateScan(id, patch) {
    const s = state().scans.find((x) => x.id === id);
    if (s) Object.assign(s, patch);
  },
  async getScan(id) {
    return state().scans.find((x) => x.id === id) ?? null;
  },
  async listScans(limit = 20) {
    return state().scans.slice(0, limit);
  },

  async createHandoff(h) {
    const row: Handoff = { ...h, id: crypto.randomUUID(), created_at: now() };
    state().handoffs.unshift(row);
    return row;
  },
  async listHandoffs(limit = 50) {
    return state().handoffs.slice(0, limit);
  },

  async getSettings() {
    return state().settings;
  },
  async saveSettings(s) {
    state().settings = s;
  },
};
