import type { NextRequest } from "next/server";
import { getStore } from "@/lib/db";
import { handOff } from "@/lib/engine/handoff";

/** Pull endpoint for the build system: GET /api/handoffs?status=queued */
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get("status");
  const rows = await getStore().listHandoffs(200);
  return Response.json(status ? rows.filter((h) => h.status === status) : rows);
}

/** Body: { opportunityId, domain?, trademarkReviewed? } */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (!body.opportunityId) return Response.json({ error: "opportunityId required" }, { status: 400 });
  const result = await handOff(getStore(), body);
  return Response.json(result, { status: result.ok ? 200 : 422 });
}
