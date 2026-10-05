import "server-only";
import { after } from "next/server";
import { getStore } from "@/lib/db";
import { executeScan, type ScanRequest } from "@/lib/engine/scan";
import { resolveProviders } from "@/lib/providers";

/** Create a scan row and run it after the response is sent. Throws early if live keys are missing. */
export async function startScan(input: Partial<ScanRequest>) {
  const req: ScanRequest = {
    mode: input.mode === "live" ? "live" : "demo",
    industries: (input.industries ?? []).map(String).filter(Boolean),
    geo: (input.geo ?? "US").toUpperCase(),
    brandLimit: input.brandLimit ? Math.max(1, Math.min(200, Number(input.brandLimit))) : undefined,
  };
  resolveProviders(req.mode, null); // validates provider config before we create the scan
  const store = getStore();
  const scan = await store.createScan({ mode: req.mode, industries: req.industries, geo: req.geo });
  after(() => executeScan(store, scan.id, req));
  return scan;
}
