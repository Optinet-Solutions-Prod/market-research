import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_SETTINGS } from "@/lib/engine/scoring";
import type { Opportunity, Settings } from "@/lib/types";
import { seedRows } from "./seed";
import type { Store } from "./store";

let client: SupabaseClient | null = null;

export function supabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Server-only client using the service role key (bypasses RLS; never ship to the browser). */
function db() {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data as T;
}

const omitId = <T extends { id?: string }>(row: T) => {
  const { id, ...rest } = row;
  return id ? { id, ...rest } : rest;
};

export const supabaseStore: Store = {
  kind: "supabase",

  async listIndustries() {
    return must(await db().from("industries").select("*").order("name"));
  },
  async upsertIndustry(i) {
    return must(await db().from("industries").upsert(omitId(i), { onConflict: "name" }).select().single());
  },
  async listBrands(industryId) {
    let q = db().from("brands").select("*").order("name");
    if (industryId) q = q.eq("industry_id", industryId);
    return must(await q);
  },
  async upsertBrand(b) {
    return must(await db().from("brands").upsert(omitId(b), { onConflict: "industry_id,name" }).select().single());
  },
  async deleteBrand(id) {
    must(await db().from("brands").delete().eq("id", id));
  },
  async listPrograms(industryId) {
    let q = db().from("affiliate_programs").select("*").order("merchant");
    if (industryId) q = q.eq("industry_id", industryId);
    return must(await q);
  },
  async upsertProgram(p) {
    return must(
      await db().from("affiliate_programs").upsert(omitId(p), { onConflict: "industry_id,merchant,network" }).select().single(),
    );
  },
  async deleteProgram(id) {
    must(await db().from("affiliate_programs").delete().eq("id", id));
  },

  async saveKeywords(brandId, geo, rows) {
    if (!rows.length) return;
    must(
      await db()
        .from("keywords")
        .upsert(rows.map((r) => ({ ...r, brand_id: brandId, geo, updated_at: new Date().toISOString() })), {
          onConflict: "brand_id,geo,keyword",
        }),
    );
  },
  async listKeywords(brandId, geo) {
    return must(await db().from("keywords").select("*").eq("brand_id", brandId).eq("geo", geo).order("volume", { ascending: false }));
  },
  async saveSerp(brandId, geo, rows) {
    must(await db().from("serp_results").delete().eq("brand_id", brandId).eq("geo", geo));
    if (rows.length) must(await db().from("serp_results").insert(rows));
  },
  async listSerp(brandId, geo) {
    return must(
      await db().from("serp_results").select("*").eq("brand_id", brandId).eq("geo", geo).order("keyword").order("position"),
    );
  },

  async upsertOpportunity(o) {
    return must(
      await db()
        .from("opportunities")
        .upsert({ ...o, updated_at: new Date().toISOString() }, { onConflict: "brand_id,geo" })
        .select()
        .single(),
    ) as Opportunity;
  },
  async listOpportunities(f = {}) {
    let q = db().from("opportunities").select("*").order("score", { ascending: false }).limit(1000);
    if (f.risk) q = q.eq("risk_tier", f.risk);
    if (f.minScore != null) q = q.gte("score", f.minScore);
    if (f.decision) q = q.eq("decision", f.decision);
    if (f.industry) q = q.eq("industry", f.industry);
    if (f.q) {
      const term = f.q.replace(/[%,()]/g, " ");
      q = q.or(`industry.ilike.%${term}%,brand.ilike.%${term}%,theme.ilike.%${term}%`);
    }
    return must(await q);
  },
  async getOpportunity(id) {
    return must(await db().from("opportunities").select("*").eq("id", id).maybeSingle());
  },
  async setOpportunityStatus(id, status) {
    must(await db().from("opportunities").update({ status }).eq("id", id));
  },
  async replaceDomains(opportunityId, domains) {
    must(await db().from("domain_candidates").delete().eq("opportunity_id", opportunityId));
    if (domains.length) {
      must(
        await db()
          .from("domain_candidates")
          .insert(domains.map(({ id: _id, ...d }) => ({ ...d, opportunity_id: opportunityId }))),
      );
    }
  },
  async listDomains(opportunityId) {
    return must(await db().from("domain_candidates").select("*").eq("opportunity_id", opportunityId));
  },

  async createScan(s) {
    return must(await db().from("scans").insert(s).select().single());
  },
  async updateScan(id, patch) {
    must(await db().from("scans").update(patch).eq("id", id));
  },
  async getScan(id) {
    return must(await db().from("scans").select("*").eq("id", id).maybeSingle());
  },
  async listScans(limit = 20) {
    return must(await db().from("scans").select("*").order("started_at", { ascending: false }).limit(limit));
  },

  async createHandoff(h) {
    return must(await db().from("handoffs").insert(h).select().single());
  },
  async listHandoffs(limit = 50) {
    return must(await db().from("handoffs").select("*").order("created_at", { ascending: false }).limit(limit));
  },

  async getSettings() {
    const row = must(await db().from("settings").select("value").eq("key", "scoring").maybeSingle()) as { value: Settings } | null;
    return row?.value
      ? { weights: { ...DEFAULT_SETTINGS.weights, ...row.value.weights }, thresholds: { ...DEFAULT_SETTINGS.thresholds, ...row.value.thresholds } }
      : structuredClone(DEFAULT_SETTINGS);
  },
  async saveSettings(s) {
    must(await db().from("settings").upsert({ key: "scoring", value: s, updated_at: new Date().toISOString() }));
  },
};

/** Idempotently load the starter catalog into Supabase (matches on natural keys). */
export async function seedSupabase() {
  const seed = seedRows(() => crypto.randomUUID());

  const industries = must(
    await db()
      .from("industries")
      .upsert(seed.industries.map(({ id: _id, ...i }) => i), { onConflict: "name" })
      .select("id,name"),
  ) as { id: string; name: string }[];
  const industryId = new Map(
    seed.industries.map((i) => [i.id, industries.find((x) => x.name === i.name)!.id]),
  );

  const brandPayload = seed.brands.map(({ id: _id, ...b }) => ({ ...b, industry_id: industryId.get(b.industry_id)! }));
  const brands = must(
    await db().from("brands").upsert(brandPayload, { onConflict: "industry_id,name" }).select("id,name,industry_id"),
  ) as { id: string; name: string; industry_id: string }[];
  const brandId = new Map(
    seed.brands.map((b) => [
      b.id,
      brands.find((x) => x.name === b.name && x.industry_id === industryId.get(b.industry_id))!.id,
    ]),
  );

  const programPayload = seed.programs.map(({ id: _id, ...p }) => ({
    ...p,
    industry_id: industryId.get(p.industry_id)!,
    brand_id: p.brand_id ? brandId.get(p.brand_id)! : null,
  }));
  must(await db().from("affiliate_programs").upsert(programPayload, { onConflict: "industry_id,merchant,network" }));

  return { industries: industries.length, brands: brands.length, programs: programPayload.length };
}
