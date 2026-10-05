import { getStore } from "@/lib/db";
import { startScan } from "@/lib/server/scan-runner";

export const maxDuration = 300;

export async function GET() {
  return Response.json(await getStore().listScans(50));
}

/** Body: { mode: "demo"|"live", industries?: string[], geo?: "US", brandLimit?: number } */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const scan = await startScan(body);
    return Response.json(scan, { status: 202 });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
