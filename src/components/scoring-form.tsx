"use client";

import { useState, useTransition } from "react";
import { saveSettingsAction } from "@/app/actions";
import { DEFAULT_SETTINGS, SIGNAL_LABELS } from "@/lib/engine/scoring";
import type { ScoringWeights, Settings, Thresholds } from "@/lib/types";

const THRESHOLD_LABELS: Record<keyof Thresholds, string> = {
  build_min_score: "BUILD: minimum score",
  review_min_score: "REVIEW: minimum score",
  max_legal_risk: "BUILD: legal risk must be below",
  max_seo_risk: "BUILD: SEO risk must be below",
  build_cost_eur: "Build cost per site (€)",
  monthly_cost_eur: "Running cost per site / month (€)",
};

export function ScoringForm({ initial }: { initial: Settings }) {
  const [s, setS] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const total = Object.values(s.weights).reduce((a, b) => a + b, 0);

  const setW = (k: keyof ScoringWeights, v: number) => setS({ ...s, weights: { ...s.weights, [k]: v } });
  const setT = (k: keyof Thresholds, v: number) => setS({ ...s, thresholds: { ...s.thresholds, [k]: v } });

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <section className="card">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Factor weights</h2>
          <span className={`text-xs ${total === 100 ? "text-muted" : "text-warn"}`}>
            Total {total} {total !== 100 && "(normalised to 100)"}
          </span>
        </div>
        {(Object.keys(SIGNAL_LABELS) as (keyof ScoringWeights)[]).map((k) => (
          <label key={k} className="my-2.5 grid grid-cols-[150px_1fr_48px] items-center gap-3 text-sm sm:grid-cols-[180px_1fr_48px]">
            <span>
              {SIGNAL_LABELS[k]}
              {(k === "seo_risk" || k === "legal_risk") && <span className="block text-[11px] text-muted">inverted risk</span>}
            </span>
            <input type="range" min={0} max={40} value={s.weights[k]} onChange={(e) => setW(k, Number(e.target.value))} className="accent-[#7aa2ff]" />
            <span className="text-right tabular-nums">{s.weights[k]}</span>
          </label>
        ))}
      </section>

      <section className="card">
        <h2 className="mb-3 text-sm font-bold">Decision gates & economics</h2>
        <div className="grid gap-3">
          {(Object.keys(THRESHOLD_LABELS) as (keyof Thresholds)[]).map((k) => (
            <label key={k} className="flex items-center justify-between gap-3 text-sm">
              <span>{THRESHOLD_LABELS[k]}</span>
              <input type="number" className="field w-28 text-right" value={s.thresholds[k]} onChange={(e) => setT(k, Number(e.target.value))} />
            </label>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted">
          Risk tier = max(legal, SEO) risk: ≥ 60 RED, ≥ 35 YELLOW, else GREEN. Handoff additionally requires an available GREEN domain (or a
          trademark-reviewed YELLOW one). RED domains are never handed off.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2.5">
          <button
            className="btn btn-primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await saveSettingsAction(s);
                setMsg(`Saved — re-scored ${r.rescored} opportunities`);
              })
            }
          >
            {pending ? "Saving…" : "Save & re-score"}
          </button>
          <button className="btn" disabled={pending} onClick={() => setS(structuredClone(DEFAULT_SETTINGS))}>
            Reset to defaults
          </button>
          {msg && <span className="text-xs text-good">{msg}</span>}
        </div>
      </section>
    </div>
  );
}
