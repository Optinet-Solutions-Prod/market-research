import "server-only";
import type { Store } from "@/lib/db/store";
import { resolveProviders } from "@/lib/providers";
import type { Brand, Industry, Keyword, Rationale, ScanMode, SerpResult, Settings } from "@/lib/types";
import { generateDomainIdeas } from "./domains";
import { COMMERCIAL_INTENTS, expandBrandKeywords } from "./keywords";
import { projectRevenue } from "./revenue";
import { decide, riskTier, score } from "./scoring";
import { classifySerpDomain, hostOf } from "./serp";
import { computeSignals } from "./signals";

export interface ScanRequest {
  mode: ScanMode;
  industries: string[]; // names; empty = all active
  geo: string;
  brandLimit?: number; // per industry
}

/** Commercial SERPs fetched per brand (each costs one SERP API call in live mode). */
const SERPS_PER_BRAND = { demo: 8, live: 4 };

export async function executeScan(store: Store, scanId: string, req: ScanRequest) {
  const log: string[] = [];
  const push = async (line: string) => {
    log.push(`${new Date().toISOString().slice(11, 19)}  ${line}`);
    await store.updateScan(scanId, { log: [...log] });
  };

  try {
    const settings = await store.getSettings();
    const all = (await store.listIndustries()).filter((i) => i.active);
    const wanted = req.industries.map((s) => s.trim().toLowerCase()).filter(Boolean);
    const industries = wanted.length
      ? all.filter((i) => wanted.some((w) => i.name.toLowerCase().includes(w) || i.slug.includes(w)))
      : all;

    const unmatched = wanted.filter((w) => !all.some((i) => i.name.toLowerCase().includes(w) || i.slug.includes(w)));
    for (const u of unmatched) await push(`⚠ No catalog industry matches "${u}" — add it on the Catalog page`);
    if (!industries.length) throw new Error("No industries to scan");

    let brandsScanned = 0;
    let found = 0;

    for (const industry of industries) {
      const brands = (await store.listBrands(industry.id)).filter((b) => b.active);
      const programs = await store.listPrograms(industry.id);
      const target = brands.filter((b) => b.geos.includes(req.geo) || req.geo === "US").slice(0, req.brandLimit ?? 50);
      await push(`▶ ${industry.name}: ${target.length} brands, ${programs.length} affiliate programs`);

      for (const brand of target) {
        try {
          const opp = await analyseBrand({ store, industry, brand, brands, programs, req, settings, scanId });
          brandsScanned++;
          found++;
          await push(`  ✓ ${brand.name} → score ${opp.score} · ${opp.decision} · €${Math.round(opp.revenue_expected)}/mo`);
        } catch (e) {
          brandsScanned++;
          await push(`  ✗ ${brand.name}: ${(e as Error).message}`);
        }
        await store.updateScan(scanId, { brands_scanned: brandsScanned, opportunities_found: found });
      }
    }

    await push(`Done. ${found} opportunities scored.`);
    await store.updateScan(scanId, { status: "done", finished_at: new Date().toISOString() });
  } catch (e) {
    await push(`Scan failed: ${(e as Error).message}`);
    await store.updateScan(scanId, { status: "failed", error: (e as Error).message, finished_at: new Date().toISOString() });
  }
}

interface AnalyseInput {
  store: Store;
  industry: Industry;
  brand: Brand;
  brands: Brand[];
  programs: Awaited<ReturnType<Store["listPrograms"]>>;
  req: ScanRequest;
  settings: Settings;
  scanId: string;
}

async function analyseBrand({ store, industry, brand, brands, programs, req, settings, scanId }: AnalyseInput) {
  const providers = resolveProviders(req.mode, brand.official_domain);
  const competitors = brands.filter((b) => b.id !== brand.id);

  // 1. Brand search ecosystem
  const seeds = expandBrandKeywords(brand.name, competitors.map((c) => c.name));
  const volumes = await providers.keywords.getVolumes(seeds.map((s) => s.keyword), req.geo);
  const vol = new Map(volumes.map((v) => [v.keyword.toLowerCase(), v]));
  const keywords: Keyword[] = seeds.map((s) => {
    const v = vol.get(s.keyword);
    return {
      brand_id: brand.id,
      geo: req.geo,
      keyword: s.keyword,
      intent: s.intent,
      modifier: s.modifier,
      volume: v?.volume ?? 0,
      cpc_eur: v?.cpc_eur ?? null,
      competition: v?.competition ?? null,
    };
  });

  // 2. SERPs for the highest-volume commercial keywords
  const officialDomains = [brand.official_domain, ...competitors.map((c) => c.official_domain)]
    .filter((d): d is string => Boolean(d))
    .map((d) => hostOf(`https://${d}`));
  const serpTargets = keywords
    .filter((k) => COMMERCIAL_INTENTS.includes(k.intent) && k.volume > 0)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, SERPS_PER_BRAND[req.mode]);
  const serps = new Map<string, SerpResult[]>();
  const serpRows: SerpResult[] = [];
  for (const k of serpTargets) {
    const rows = await providers.serp.getSerp(k.keyword, req.geo);
    const parsed = rows.map((r): SerpResult => ({
      brand_id: brand.id,
      geo: req.geo,
      keyword: k.keyword,
      position: r.position,
      url: r.url,
      domain: hostOf(r.url),
      title: r.title,
      // Competitor official sites ranking for this brand's queries are strong results too
      kind: classifySerpDomain(r.url, officialDomains),
    }));
    serps.set(k.keyword, parsed);
    serpRows.push(...parsed);
  }

  // 3. Domain ideas + availability (RED ideas are never checked or bought)
  const domains = generateDomainIdeas({
    brand: brand.name,
    industry: industry.name,
    geo: req.geo,
    allBrands: brands.map((b) => b.name),
  });
  const checkable = domains.filter((d) => d.risk !== "RED").map((d) => d.domain);
  const availability = await providers.domains.check(checkable);
  const checkedAt = new Date().toISOString();
  for (const d of domains) {
    if (availability.has(d.domain)) {
      d.available = availability.get(d.domain) ?? null;
      d.checked_at = checkedAt;
    }
  }

  // 4. Signals → score → economics
  const sig = computeSignals({ industry, brand, competitors, keywords, serps, programs, domains });
  const total = score(sig.signals, settings.weights);
  const { economics, funnel } = projectRevenue(
    {
      commercialVolume: sig.commercialVolume,
      serpWeakness: sig.signals.serp_weakness,
      conversionIntent: sig.signals.conversion_intent,
      merchantConversion: sig.merchantConversion,
      avgCommission: sig.avgCommission,
    },
    settings.thresholds,
  );

  const topKeywords = [...keywords]
    .filter((k) => COMMERCIAL_INTENTS.includes(k.intent))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 12)
    .map((k) => ({ keyword: k.keyword, volume: k.volume, intent: k.intent }));

  const rationale: Rationale = {
    highlights: sig.notes.highlights,
    risks: sig.notes.risks,
    top_keywords: topKeywords,
    competitors: competitors.map((c) => c.name),
    programs: sig.usablePrograms.slice(0, 6).map((p) => ({
      merchant: p.program.merchant,
      network: p.program.network,
      value_eur: Math.round(p.value),
      model: p.program.model,
    })),
    site_structure: siteStructure(brand, industry, competitors, keywords),
    seo_strategy: seoStrategy(sig.signals.serp_weakness, industry),
    budget: { build_eur: settings.thresholds.build_cost_eur, monthly_eur: settings.thresholds.monthly_cost_eur },
    funnel,
  };

  const opp = await store.upsertOpportunity({
    brand_id: brand.id,
    scan_id: scanId,
    geo: req.geo,
    industry: industry.name,
    brand: brand.name,
    theme: themeFor(brand.name, keywords),
    search_volume: sig.totalVolume,
    commercial_volume: sig.commercialVolume,
    commercial_share: sig.commercialShare,
    ...sig.signals,
    ...economics,
    score: total,
    risk_tier: riskTier(sig.signals),
    decision: decide(total, sig.signals, settings.thresholds),
    rationale,
  });

  await store.saveKeywords(brand.id, req.geo, keywords);
  await store.saveSerp(brand.id, req.geo, serpRows);
  await store.replaceDomains(opp.id, domains);
  return opp;
}

function themeFor(brand: string, keywords: Keyword[]) {
  const byMod = new Map<string, number>();
  for (const k of keywords) {
    if (!COMMERCIAL_INTENTS.includes(k.intent)) continue;
    const m = k.modifier ?? "core";
    byMod.set(m, (byMod.get(m) ?? 0) + k.volume);
  }
  const top = [...byMod.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  switch (top) {
    case "alternatives":
    case "competitors":
    case "best alternative":
      return `${brand} alternatives & switching guides`;
    case "vs":
      return `${brand} head-to-head comparisons`;
    case "pricing":
    case "cheaper than":
      return `${brand} pricing & cheaper options`;
    case "cancel":
      return `Leaving ${brand}: alternatives for churners`;
    case "discount":
    case "coupon":
    case "free trial":
      return `${brand} deals vs competitor offers`;
    default:
      return `${brand} reviews & comparisons`;
  }
}

function siteStructure(brand: Brand, industry: Industry, competitors: Brand[], keywords: Keyword[]) {
  const vs = keywords
    .filter((k) => k.modifier === "vs" && k.volume > 0)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, 3)
    .map((k) => `/compare/${k.keyword.replace(/\s+/g, "-")}`);
  return [
    `/ — ${industry.name} comparison hub with filterable table (pricing, features, ratings)`,
    `/alternatives/${slug(brand.name)} — ranked alternatives with "best for" picks`,
    `/pricing/${slug(brand.name)} — original pricing breakdown + cost calculator vs ${competitors[0]?.name ?? "competitors"}`,
    ...vs,
    `/reviews — hands-on reviews of ${competitors.slice(0, 4).map((c) => c.name).join(", ")}`,
    `/tools/finder — interactive "which ${industry.name.toLowerCase()} fits me" quiz`,
    `/deals — current competitor offers (only where program terms allow)`,
  ];
}

function seoStrategy(serpWeakness: number, industry: Industry) {
  const out = [
    "Target comparison/alternative intent; do not target navigational brand queries",
    "Lead with original data: pricing tables, feature matrices, calculators, real screenshots",
    "One authoritative site per cluster — no networks of near-duplicate sites (doorway policy)",
    "Clear affiliate disclosure and editorial methodology page",
  ];
  if (serpWeakness >= 65) out.push("SERP is soft: prioritise /alternatives and /vs pages for fast wins");
  else out.push("SERP is competitive: build topical depth + digital PR before expecting top-5");
  if (industry.regulated) out.push("YMYL vertical: named expert authors, sourcing, and compliance review");
  return out;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
