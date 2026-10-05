import { getStore } from "@/lib/db";

export async function GET(_req: Request, ctx: RouteContext<"/api/scans/[id]">) {
  const { id } = await ctx.params;
  const scan = await getStore().getScan(id);
  return scan ? Response.json(scan) : Response.json({ error: "not found" }, { status: 404 });
}
