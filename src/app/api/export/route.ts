import type { NextRequest } from "next/server";
import { getStore } from "@/lib/db";
import { parseFilters } from "@/lib/filters";

const COLS = [
  "industry", "brand", "theme", "geo", "search_volume", "commercial_volume", "score", "decision", "risk_tier",
  "serp_weakness", "affiliate_economics", "seo_risk", "legal_risk", "avg_commission",
  "revenue_conservative", "revenue_expected", "revenue_aggressive", "break_even_months", "status",
] as const;

export async function GET(req: NextRequest) {
  const rows = await getStore().listOpportunities(parseFilters(Object.fromEntries(req.nextUrl.searchParams)));
  const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const csv = [COLS.join(","), ...rows.map((r) => COLS.map((c) => esc(r[c])).join(","))].join("\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="opportunity-radar-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
