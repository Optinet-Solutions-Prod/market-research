import type { NextRequest } from "next/server";
import { getStore } from "@/lib/db";
import { parseFilters } from "@/lib/filters";

/** Query: risk, minScore, decision, industry, q */
export async function GET(req: NextRequest) {
  const filters = parseFilters(Object.fromEntries(req.nextUrl.searchParams));
  return Response.json(await getStore().listOpportunities(filters));
}
