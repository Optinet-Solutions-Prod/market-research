import { SEED_CATALOG } from "@/lib/catalog";
import type { AffiliateProgram, Brand, Industry } from "@/lib/types";

export const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/** Expand the starter catalog into table rows with ids from `newId`. */
export function seedRows(newId: () => string) {
  const industries: Industry[] = [];
  const brands: Brand[] = [];
  const programs: AffiliateProgram[] = [];

  for (const s of SEED_CATALOG) {
    const industry: Industry = {
      id: newId(),
      name: s.name,
      slug: slugify(s.name),
      regulated: s.regulated ?? false,
      default_conversion: s.conversion ?? 0.04,
      active: true,
    };
    industries.push(industry);

    const byName = new Map<string, Brand>();
    for (const b of s.brands) {
      const brand: Brand = {
        id: newId(),
        industry_id: industry.id,
        name: b.name,
        official_domain: b.domain,
        geos: b.geos ?? ["US"],
        active: true,
      };
      brands.push(brand);
      byName.set(b.name, brand);
    }

    for (const p of s.programs) {
      programs.push({
        id: newId(),
        industry_id: industry.id,
        brand_id: byName.get(p.merchant)?.id ?? null,
        merchant: p.merchant,
        network: p.network ?? "direct",
        model: p.model,
        payout_eur: p.payout_eur ?? 0,
        revshare_pct: p.revshare_pct ?? null,
        avg_order_eur: p.avg_order_eur ?? null,
        recurring_months: p.recurring_months ?? null,
        cookie_days: p.cookie_days ?? 30,
        conversion_rate: p.conversion_rate ?? null,
        epc_eur: p.epc_eur ?? null,
        geos: p.geos ?? ["US"],
        allows_brand_keywords: p.allows_brand_keywords ?? false,
        allows_competitor_comparison: p.allows_competitor_comparison ?? true,
        notes: p.notes ?? "Illustrative terms — verify in network dashboard",
      });
    }
  }
  return { industries, brands, programs };
}
