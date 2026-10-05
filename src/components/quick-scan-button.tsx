"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { getScanAction, startScanAction } from "@/app/actions";

/** Runs a demo scan across the whole catalog and refreshes when it finishes. */
export function QuickScanButton() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    setMsg("Starting…");
    const res = await startScanAction({ mode: "demo", industries: [], geo: "US" });
    if (!res.ok) {
      setBusy(false);
      setMsg(res.error);
      return;
    }
    for (;;) {
      await new Promise((r) => setTimeout(r, 1000));
      const scan = await getScanAction(res.scanId);
      if (!scan) break;
      setMsg(`Scanned ${scan.brands_scanned} brands…`);
      if (scan.status !== "running") break;
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button className="btn btn-primary" onClick={run} disabled={busy}>
        {busy ? "Scanning…" : "Run demo scan"}
      </button>
      {msg && <div className="text-xs text-muted">{msg}</div>}
    </div>
  );
}
