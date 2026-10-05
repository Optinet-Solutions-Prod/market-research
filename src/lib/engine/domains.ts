import type { DomainCandidate, DomainRisk } from "@/lib/types";

/**
 * Domain ideas for an opportunity, each classified by trademark risk.
 *
 *  GREEN  – generic / category / editorial. Eligible for automatic purchase.
 *  YELLOW – contains a brand in a clearly comparative context. Manual review.
 *  RED    – exact brand on another TLD, typo of a brand, or anything that could
 *           pass as the brand itself. Never auto-purchased or handed off.
 *
 * Swapping .com for .net/.io/.co does not reduce confusing-similarity risk under
 * UDRP, so alternate-TLD brand domains are surfaced for visibility only.
 */

const GEO_TLDS: Record<string, string> = { DE: "de", UK: "co.uk", FR: "fr", NL: "nl", ES: "es", IT: "it" };

const COMPARATIVE = ["alternatives", "vs", "versus", "compare", "comparison", "review", "reviews", "competitors"];

export function clean(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Shortened category stem, e.g. "Email Marketing SaaS" → "emailmarketing". */
export function categoryStem(industry: string) {
  return clean(industry.replace(/\b(saas|software|platforms?|services?|tools?)\b/gi, "")) || clean(industry);
}

export function generateDomainIdeas(input: {
  brand: string;
  industry: string;
  geo: string;
  allBrands: string[];
}): DomainCandidate[] {
  const brand = clean(input.brand);
  const cat = categoryStem(input.industry);
  const ideas: { domain: string; pattern: string }[] = [];

  for (const tld of ["com", "net", "co"]) {
    ideas.push({ domain: `${brand}.${tld}`, pattern: "exact-brand" });
  }
  ideas.push({ domain: `${brand}s.com`, pattern: "brand-typo" });
  ideas.push({ domain: `${brand}alternatives.com`, pattern: "brand-alternatives" });
  ideas.push({ domain: `${brand}vs.com`, pattern: "brand-vs" });

  for (const tld of ["com", "io", "co"]) {
    ideas.push({ domain: `${cat}alternatives.${tld}`, pattern: "category-alternatives" });
    ideas.push({ domain: `compare${cat}.${tld}`, pattern: "category-compare" });
    ideas.push({ domain: `best${cat}.${tld}`, pattern: "category-best" });
  }
  ideas.push({ domain: `${cat}picks.com`, pattern: "category-editorial" });
  ideas.push({ domain: `${cat}finder.com`, pattern: "category-tool" });
  ideas.push({ domain: `${cat}pricing.com`, pattern: "category-pricing" });

  const geoTld = GEO_TLDS[input.geo];
  if (geoTld) {
    ideas.push({ domain: `${cat}vergleich.${geoTld}`, pattern: "geo-compare" });
    ideas.push({ domain: `best${cat}.${geoTld}`, pattern: "geo-best" });
  }

  const seen = new Set<string>();
  return ideas
    .filter((i) => !seen.has(i.domain) && (seen.add(i.domain), true))
    .map((i) => {
      const { risk, reason } = classifyDomain(i.domain, input.allBrands);
      return {
        domain: i.domain,
        pattern: i.pattern,
        risk,
        reason,
        quality: domainQuality(i.domain),
        available: null,
        checked_at: null,
      };
    });
}

/** Classify any domain against the known brand universe. */
export function classifyDomain(domain: string, brands: string[]): { risk: DomainRisk; reason: string } {
  const [label] = domain.toLowerCase().split(".");
  const sld = label.replace(/-/g, "");

  for (const b of brands.map(clean).filter((b) => b.length >= 3)) {
    if (sld === b) {
      return { risk: "RED", reason: `Exact "${b}" trademark on another TLD — blocked from auto-buy, UDRP exposure.` };
    }
    if (b.length >= 5 && levenshtein(sld, b) <= 2) {
      return { risk: "RED", reason: `Typo/variant of "${b}" — likely confusing similarity, blocked.` };
    }
    if (sld.includes(b)) {
      const rest = sld.replace(b, "");
      const comparative = COMPARATIVE.some((w) => rest.includes(w));
      if (comparative) {
        return {
          risk: "YELLOW",
          reason: `Contains "${b}" in a comparative context — needs trademark review before purchase.`,
        };
      }
      return { risk: "RED", reason: `Contains "${b}" without comparative context — could pass as the brand.` };
    }
  }
  return { risk: "GREEN", reason: "Generic commercial-intent domain — no brand tokens." };
}

/** 0-100: short, .com, no hyphens/digits, readable. */
export function domainQuality(domain: string) {
  const [label, ...rest] = domain.split(".");
  const tld = rest.join(".");
  let q = 100;
  q -= Math.max(0, label.length - 10) * 3;
  if (/-/.test(label)) q -= 15;
  if (/\d/.test(label)) q -= 15;
  if (tld !== "com") q -= tld === "io" || tld === "co" ? 10 : 6;
  return Math.max(10, Math.min(100, Math.round(q)));
}

export function levenshtein(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}
