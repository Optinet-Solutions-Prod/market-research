import { getStore } from "@/lib/db";

export async function GET(_req: Request, ctx: RouteContext<"/api/opportunities/[id]">) {
  const { id } = await ctx.params;
  const store = getStore();
  const opportunity = await store.getOpportunity(id);
  if (!opportunity) return Response.json({ error: "not found" }, { status: 404 });
  const [domains, keywords, serp] = await Promise.all([
    store.listDomains(id),
    store.listKeywords(opportunity.brand_id, opportunity.geo),
    store.listSerp(opportunity.brand_id, opportunity.geo),
  ]);
  return Response.json({ opportunity, domains, keywords, serp });
}
