import "server-only";
import { createHmac } from "node:crypto";
import type { Store } from "@/lib/db/store";
import type { Handoff } from "@/lib/types";
import { handoffBlockers } from "./scoring";

export interface HandoffRequest {
  opportunityId: string;
  domain?: string;
  /** Required to hand off a YELLOW (brand-in-comparative-context) domain. */
  trademarkReviewed?: boolean;
}

export type HandoffResult =
  | { ok: true; handoff: Handoff }
  | { ok: false; blockers: string[]; handoff?: Handoff };

/**
 * Gate + deliver an opportunity to the external build system.
 * RED domains are never handed off. YELLOW needs explicit trademark review.
 * If BUILD_WEBHOOK_URL is unset, the handoff is queued for pull via GET /api/handoffs?status=queued.
 */
export async function handOff(store: Store, req: HandoffRequest): Promise<HandoffResult> {
  const opp = await store.getOpportunity(req.opportunityId);
  if (!opp) return { ok: false, blockers: ["opportunity not found"] };
  const settings = await store.getSettings();
  const domains = await store.listDomains(opp.id);

  const blockers = handoffBlockers(opp, settings.thresholds);
  if (opp.status === "REJECTED") blockers.push("opportunity was rejected");
  if (opp.status === "HANDED_OFF") blockers.push("already handed off");

  const pick = req.domain
    ? domains.find((d) => d.domain === req.domain)
    : domains
        .filter((d) => d.risk === "GREEN" && d.available === true)
        .sort((a, b) => b.quality - a.quality)[0];

  if (!pick) blockers.push(req.domain ? `domain ${req.domain} is not a candidate for this opportunity` : "no available GREEN domain");
  else {
    if (pick.risk === "RED") blockers.push(`${pick.domain} is RED (trademark) — never handed off`);
    if (pick.risk === "YELLOW" && !req.trademarkReviewed) blockers.push(`${pick.domain} is YELLOW — confirm trademark review first`);
    if (pick.available === false) blockers.push(`${pick.domain} is already registered`);
  }

  if (blockers.length) {
    const handoff = await store.createHandoff({
      opportunity_id: opp.id,
      domain: pick?.domain ?? req.domain ?? "",
      status: "blocked",
      payload: { blockers },
      response: null,
    });
    return { ok: false, blockers, handoff };
  }

  const payload = {
    event: "opportunity.approved",
    sent_at: new Date().toISOString(),
    opportunity: {
      id: opp.id,
      industry: opp.industry,
      brand_signal: opp.brand,
      theme: opp.theme,
      geo: opp.geo,
      score: opp.score,
      revenue_expected_eur: opp.revenue_expected,
      revenue_range_eur: [opp.revenue_conservative, opp.revenue_aggressive],
      break_even_months: opp.break_even_months,
    },
    domain: { name: pick!.domain, risk: pick!.risk, trademark_reviewed: pick!.risk === "YELLOW" },
    keywords: opp.rationale.top_keywords,
    affiliate_programs: opp.rationale.programs,
    site_structure: opp.rationale.site_structure,
    seo_strategy: opp.rationale.seo_strategy,
    budget: opp.rationale.budget,
  };

  const url = process.env.BUILD_WEBHOOK_URL;
  let status: Handoff["status"] = "queued";
  let response: string | null = "No BUILD_WEBHOOK_URL set — queued for pull";

  if (url) {
    const body = JSON.stringify(payload);
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (process.env.BUILD_WEBHOOK_SECRET) {
      headers["X-Radar-Signature"] = `sha256=${createHmac("sha256", process.env.BUILD_WEBHOOK_SECRET).update(body).digest("hex")}`;
    }
    try {
      const res = await fetch(url, { method: "POST", headers, body, cache: "no-store", signal: AbortSignal.timeout(15000) });
      status = res.ok ? "sent" : "failed";
      response = `HTTP ${res.status} ${(await res.text()).slice(0, 500)}`;
    } catch (e) {
      status = "failed";
      response = (e as Error).message;
    }
  }

  const handoff = await store.createHandoff({ opportunity_id: opp.id, domain: pick!.domain, status, payload, response });
  if (status !== "failed") await store.setOpportunityStatus(opp.id, "HANDED_OFF");
  return status === "failed" ? { ok: false, blockers: [`webhook failed: ${response}`], handoff } : { ok: true, handoff };
}
