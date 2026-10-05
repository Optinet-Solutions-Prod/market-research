import type { AffiliateProgram, Brand, DomainCandidate, Industry, Keyword, SerpResult, Signals } from "@/lib/types";
import { COMMERCIAL_INTENTS, INTENT_VALUE } from "./keywords";
import { serpWeakness } from "./serp";
import { clamp } from "./scoring";

/** € value of one conversion for a program (revshare/recurring converted using avg order). */
export function programValue(p: AffiliateProgram) {
  if (p.model === "CPA" || p.model === "CPL") return p.payout_eur;
  const order = p.avg_order_eur ?? 0;
  const pct = (p.revshare_pct ?? 0) / 100;
  const months = p.model === "RECURRING" ? Math.min(p.recurring_months ?? 12, 24) : 1;
  // Recurring payouts discounted for churn (~60% of the nominal lifetime)
  const churn = p.model === "RECURRING" ? 0.6 : 1;
  return Math.max(p.payout_eur, order * pct * months * churn);
}

export interface SignalContext {
  industry: Industry;
  brand: Brand;
  competitors: Brand[];
  keywords: Keyword[];
  serps: Map<string, SerpResult[]>;
  programs: AffiliateProgram[]; // all programs in the industry
  domains: DomainCandidate[];
}

export interface SignalResult {
  signals: Signals;
  totalVolume: number;
  commercialVolume: number;
  commercialShare: number;
  avgCommission: number;
  merchantConversion: number;
  usablePrograms: { program: AffiliateProgram; value: number }[];
  serpBreakdown: { keyword: string; weakness: number; volume: number }[];
  notes: { highlights: string[]; risks: string[] };
}

export function computeSignals(ctx: SignalContext): SignalResult {
  const highlights: string[] = [];
  const risks: string[] = [];

  // ---- Demand -------------------------------------------------------------
  const totalVolume = sum(ctx.keywords.map((k) => k.volume));
  const commercial = ctx.keywords.filter((k) => COMMERCIAL_INTENTS.includes(k.intent));
  const commercialVolume = sum(commercial.map((k) => k.volume));
  const commercialShare = totalVolume ? commercialVolume / totalVolume : 0;
  // Log scale: ~10.5k commercial searches/month saturates the signal
  const commercialDemand = commercialVolume > 0 ? clamp((Math.log10(commercialVolume) / Math.log10(10500)) * 100) : 0;

  // ---- Conversion intent (volume-weighted intent value) -----------------
  const intentWeighted = commercialVolume
    ? sum(commercial.map((k) => k.volume * INTENT_VALUE[k.intent])) / commercialVolume
    : 0;
  const conversionIntent = clamp(intentWeighted * 100);

  // ---- SERP weakness (volume-weighted over analysed commercial SERPs) ----
  const serpBreakdown: SignalResult["serpBreakdown"] = [];
  for (const k of commercial) {
    const res = ctx.serps.get(k.keyword);
    if (res?.length) serpBreakdown.push({ keyword: k.keyword, weakness: serpWeakness(res, k.keyword), volume: k.volume });
  }
  const serpVol = sum(serpBreakdown.map((s) => s.volume));
  const serpWeak = serpVol ? sum(serpBreakdown.map((s) => s.weakness * s.volume)) / serpVol : 50;
  const officialTop3 = [...ctx.serps.values()].filter((r) =>
    r.some((x) => x.kind === "official" && x.position <= 3),
  ).length;

  // ---- Affiliate economics ----------------------------------------------
  // Competitor programs that permit comparison content are what we monetise.
  const usablePrograms = ctx.programs
    .filter((p) => p.brand_id !== ctx.brand.id && p.allows_competitor_comparison)
    .map((program) => ({ program, value: programValue(program) }))
    .sort((a, b) => b.value - a.value);
  const top = usablePrograms.slice(0, 3);
  const avgCommission = top.length ? sum(top.map((t) => t.value)) / top.length : 0;
  // €250+/conversion saturates; log so €20 vs €40 still differentiates
  const affiliateEconomics = avgCommission > 0 ? clamp((Math.log10(avgCommission + 1) / Math.log10(251)) * 100) : 0;
  const convs = top.map((t) => t.program.conversion_rate).filter((c): c is number => c != null);
  const merchantConversion = convs.length ? sum(convs) / convs.length : ctx.industry.default_conversion;

  // ---- Competitor diversity ---------------------------------------------
  const merchants = new Set(usablePrograms.map((p) => p.program.merchant));
  const competitorDiversity = clamp((merchants.size / 6) * 100);

  // ---- Domain quality (best GREEN, available-or-unknown domain) ----------
  const green = ctx.domains.filter((d) => d.risk === "GREEN" && d.available !== false);
  const domainQuality = green.length ? Math.max(...green.map((d) => d.quality)) : 0;

  // ---- Content moat: breadth of monetisable sub-topics we can build tools for
  // (a cluster only counts once it has enough demand to justify a dedicated page/tool)
  const clusters = new Set(commercial.filter((k) => k.volume >= 300).map((k) => k.modifier ?? "core"));
  const vsCount = commercial.filter((k) => k.modifier === "vs" && k.volume >= 300).length;
  const contentMoat = clamp(clusters.size * 6 + vsCount * 4 + (ctx.competitors.length >= 5 ? 8 : 0));

  // ---- Geo expansion -----------------------------------------------------
  const geos = new Set([...ctx.brand.geos, ...usablePrograms.flatMap((p) => p.program.geos)]);
  const geoExpansion = clamp(20 + geos.size * 12);

  // ---- SEO risk (platform / algorithmic risk) ---------------------------
  let seoRisk = 10;
  if (ctx.industry.regulated) seoRisk += 25; // YMYL scrutiny
  seoRisk += Math.min(25, officialTop3 * 3); // brand owns its own SERPs
  seoRisk += serpWeak < 40 ? 15 : 0;
  if (commercialShare < 0.2) seoRisk += 10; // mostly navigational → doorway-like if targeted

  // ---- Legal / program risk ---------------------------------------------
  let legalRisk = 8;
  if (ctx.industry.regulated) legalRisk += 15;
  const restricted = usablePrograms.filter((p) => !p.program.allows_brand_keywords).length;
  if (usablePrograms.length && restricted / usablePrograms.length > 0.6) legalRisk += 8;
  if (usablePrograms.length === 0) legalRisk += 20;
  if (green.length === 0) legalRisk += 25; // only brand-bearing domains left

  // ---- Notes -------------------------------------------------------------
  if (commercialVolume > 5000) highlights.push(`${fmt(commercialVolume)} commercial brand searches / month`);
  const alt = commercial.find((k) => k.modifier === "alternatives");
  if (alt && alt.volume > 500) highlights.push(`"${alt.keyword}" = ${fmt(alt.volume)} searches`);
  if (serpWeak >= 65) highlights.push(`Weak commercial SERPs (weakness ${Math.round(serpWeak)}/100)`);
  if (avgCommission >= 80) highlights.push(`Top competitor payouts average €${Math.round(avgCommission)}`);
  if (merchants.size >= 4) highlights.push(`${merchants.size} competing merchants to monetise`);
  if (ctx.industry.regulated) risks.push("Regulated / YMYL vertical: expect stricter Google quality bar and compliance review");
  if (officialTop3 >= 4) risks.push("Brand owns top-3 on many of its own commercial queries");
  if (usablePrograms.length === 0) risks.push("No competitor affiliate program permits comparison content");
  if (green.length === 0) risks.push("No available generic domain — only brand-bearing domains (blocked)");
  if (restricted > 0) risks.push(`${restricted} program(s) prohibit bidding/targeting brand keywords — organic only`);
  risks.push("Exact-brand / alternate-TLD domains are flagged RED and never auto-purchased");

  return {
    signals: {
      commercial_demand: round1(commercialDemand),
      serp_weakness: Math.round(serpWeak),
      affiliate_economics: Math.round(affiliateEconomics),
      conversion_intent: Math.round(conversionIntent),
      domain_quality: Math.round(domainQuality),
      competitor_diversity: Math.round(competitorDiversity),
      content_moat: Math.round(contentMoat),
      geo_expansion: Math.round(geoExpansion),
      seo_risk: Math.round(clamp(seoRisk)),
      legal_risk: Math.round(clamp(legalRisk)),
    },
    totalVolume,
    commercialVolume,
    commercialShare: Math.round(commercialShare * 1000) / 1000,
    avgCommission,
    merchantConversion,
    usablePrograms,
    serpBreakdown,
    notes: { highlights, risks },
  };
}

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const round1 = (n: number) => Math.round(n * 10) / 10;
const fmt = (n: number) => new Intl.NumberFormat("en-US").format(Math.round(n));
