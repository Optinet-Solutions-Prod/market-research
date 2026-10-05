"use server";

import { revalidatePath } from "next/cache";
import { getStore } from "@/lib/db";
import { seedSupabase, supabaseConfigured } from "@/lib/db/supabase";
import { handOff } from "@/lib/engine/handoff";
import { decide, riskTier, score } from "@/lib/engine/scoring";
import { startScan } from "@/lib/server/scan-runner";
import type { AffiliateProgram, OpportunityStatus, ScanMode, Settings } from "@/lib/types";
import { slugify } from "@/lib/db/seed";

export async function startScanAction(input: { mode: ScanMode; industries: string[]; geo: string; brandLimit?: number }) {
  try {
    const scan = await startScan(input);
    return { ok: true as const, scanId: scan.id };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  }
}

export async function getScanAction(id: string) {
  return getStore().getScan(id);
}

export async function handoffAction(input: { opportunityId: string; domain?: string; trademarkReviewed?: boolean }) {
  const result = await handOff(getStore(), input);
  revalidatePath("/", "layout");
  return result.ok
    ? { ok: true as const, status: result.handoff.status, response: result.handoff.response }
    : { ok: false as const, blockers: result.blockers };
}

export async function setStatusAction(id: string, status: OpportunityStatus) {
  await getStore().setOpportunityStatus(id, status);
  revalidatePath("/", "layout");
}

/** Save weights/thresholds and re-score every stored opportunity from its saved signals. */
export async function saveSettingsAction(settings: Settings) {
  const store = getStore();
  await store.saveSettings(settings);
  const opps = await store.listOpportunities();
  for (const o of opps) {
    const s = score(o, settings.weights);
    const { id: _id, status: _status, updated_at: _u, ...rest } = o;
    await store.upsertOpportunity({ ...rest, score: s, decision: decide(s, o, settings.thresholds), risk_tier: riskTier(o) });
  }
  revalidatePath("/", "layout");
  return { rescored: opps.length };
}

export async function addIndustryAction(form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  if (!name) return;
  await getStore().upsertIndustry({
    name,
    slug: slugify(name),
    regulated: form.get("regulated") === "on",
    default_conversion: Number(form.get("conversion") || 0.04),
    active: true,
  });
  revalidatePath("/catalog");
}

export async function addBrandAction(form: FormData) {
  const name = String(form.get("name") ?? "").trim();
  const industry_id = String(form.get("industry_id") ?? "");
  if (!name || !industry_id) return;
  await getStore().upsertBrand({
    industry_id,
    name,
    official_domain: String(form.get("domain") ?? "").trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "") || null,
    geos: geoList(form.get("geos")),
    active: true,
  });
  revalidatePath("/catalog");
}

export async function deleteBrandAction(id: string) {
  await getStore().deleteBrand(id);
  revalidatePath("/", "layout");
}

export async function addProgramAction(form: FormData) {
  const merchant = String(form.get("merchant") ?? "").trim();
  const industry_id = String(form.get("industry_id") ?? "");
  if (!merchant || !industry_id) return;
  const store = getStore();
  const brand = (await store.listBrands(industry_id)).find((b) => b.name.toLowerCase() === merchant.toLowerCase());
  const num = (k: string) => (form.get(k) ? Number(form.get(k)) : null);
  const program: Omit<AffiliateProgram, "id"> = {
    industry_id,
    brand_id: brand?.id ?? null,
    merchant,
    network: String(form.get("network") || "direct"),
    model: String(form.get("model") || "CPA") as AffiliateProgram["model"],
    payout_eur: num("payout_eur") ?? 0,
    revshare_pct: num("revshare_pct"),
    avg_order_eur: num("avg_order_eur"),
    recurring_months: num("recurring_months"),
    cookie_days: num("cookie_days") ?? 30,
    conversion_rate: num("conversion_rate"),
    epc_eur: null,
    geos: geoList(form.get("geos")),
    allows_brand_keywords: form.get("allows_brand_keywords") === "on",
    allows_competitor_comparison: form.get("allows_competitor_comparison") !== null,
    notes: String(form.get("notes") ?? "") || null,
  };
  await store.upsertProgram(program);
  revalidatePath("/catalog");
}

export async function deleteProgramAction(id: string) {
  await getStore().deleteProgram(id);
  revalidatePath("/catalog");
}

export async function seedCatalogAction() {
  if (!supabaseConfigured()) return { ok: false as const, error: "Supabase not configured — memory store is already seeded" };
  try {
    return { ok: true as const, ...(await seedSupabase()) };
  } catch (e) {
    return { ok: false as const, error: (e as Error).message };
  } finally {
    revalidatePath("/", "layout");
  }
}

function geoList(v: FormDataEntryValue | null) {
  const geos = String(v ?? "")
    .split(/[,\s]+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  return geos.length ? geos : ["US"];
}
