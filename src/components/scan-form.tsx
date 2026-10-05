"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getScanAction, startScanAction } from "@/app/actions";
import type { Scan, ScanMode } from "@/lib/types";

export function ScanForm({ industries, geos, liveReady }: { industries: string[]; geos: string[]; liveReady: boolean }) {
  const router = useRouter();
  const [text, setText] = useState(industries.join("\n"));
  const [mode, setMode] = useState<ScanMode>("demo");
  const [geo, setGeo] = useState("US");
  const [limit, setLimit] = useState("");
  const [scan, setScan] = useState<Scan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    if (!scan || scan.status !== "running") return;
    const t = setTimeout(async () => {
      const next = await getScanAction(scan.id);
      if (next) setScan(next);
      if (next && next.status !== "running") router.refresh();
    }, 1000);
    return () => clearTimeout(t);
  }, [scan, router]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [scan?.log.length]);

  async function run() {
    setError(null);
    const res = await startScanAction({
      mode,
      geo,
      industries: text.split("\n").map((s) => s.trim()).filter(Boolean),
      brandLimit: limit ? Number(limit) : undefined,
    });
    if (!res.ok) return setError(res.error);
    setScan(await getScanAction(res.scanId));
  }

  const running = scan?.status === "running";

  return (
    <section className="card space-y-4">
      <div>
        <div className="label mb-1.5">Industries (one per line — partial names match)</div>
        <textarea className="field h-48 w-full resize-y font-mono" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-1 text-xs text-muted">Leave empty to scan the whole catalog. Add new industries/brands on the Catalog page.</div>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1">
          <span className="label">Mode</span>
          <select className="field" value={mode} onChange={(e) => setMode(e.target.value as ScanMode)}>
            <option value="demo">Demo (synthetic data)</option>
            <option value="live" disabled={!liveReady}>
              Live (DataForSEO){liveReady ? "" : " — not configured"}
            </option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Market</span>
          <select className="field" value={geo} onChange={(e) => setGeo(e.target.value)}>
            {geos.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="label">Brands / industry</span>
          <input className="field w-28" type="number" min={1} placeholder="all" value={limit} onChange={(e) => setLimit(e.target.value)} />
        </label>
      </div>

      {mode === "live" && (
        <p className="text-xs text-muted">
          Live mode costs ≈ 1 keyword-volume request + 4 SERP requests per brand on DataForSEO. Limit brands per industry for a first run.
        </p>
      )}

      <div className="flex items-center gap-3">
        <button className="btn btn-primary" onClick={run} disabled={running}>
          {running ? "Scanning…" : mode === "live" ? "Run live scan" : "Run demo scan"}
        </button>
        {scan && !running && (
          <Link href="/" className="btn">
            View results →
          </Link>
        )}
      </div>

      {error && <p className="text-sm text-[#ff9ca3]">{error}</p>}

      {scan && (
        <div>
          <div className="mb-1.5 flex justify-between text-xs text-muted">
            <span>
              {scan.status.toUpperCase()} · {scan.brands_scanned} brands · {scan.opportunities_found} scored
            </span>
            <span>{scan.mode} · {scan.geo}</span>
          </div>
          <pre ref={logRef} className="max-h-72 overflow-auto rounded-xl border border-line bg-[#0b1222] p-3 text-xs leading-relaxed text-[#c8d2eb]">
            {scan.log.join("\n") || "Starting…"}
          </pre>
        </div>
      )}
    </section>
  );
}
