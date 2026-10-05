import type { Decision, OpportunityFilters, RiskTier } from "@/lib/types";

const RISKS: RiskTier[] = ["green", "yellow", "red"];
const DECISIONS: Decision[] = ["BUILD", "REVIEW", "SKIP"];

export function parseFilters(p: Record<string, string | string[] | undefined>): OpportunityFilters {
  const one = (k: string) => {
    const v = p[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const risk = one("risk") as RiskTier | undefined;
  const decision = one("decision") as Decision | undefined;
  const minScore = Number(one("minScore"));
  return {
    risk: risk && RISKS.includes(risk) ? risk : undefined,
    decision: decision && DECISIONS.includes(decision) ? decision : undefined,
    minScore: Number.isFinite(minScore) && minScore > 0 ? minScore : undefined,
    industry: one("industry") || undefined,
    q: one("q") || undefined,
  };
}
