"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { EMPTY_FILTERS, type BoardFilters, type SortKey } from "@/lib/board";
import type { Opportunity } from "@/lib/types";
import { DecisionPill, Kpi, RiskPill, StatusPill, euro, num } from "./ui";

const RISK_ORDER = { green: 0, yellow: 1, red: 2 };
const DECISION_ORDER = { BUILD: 2, REVIEW: 1, SKIP: 0 };

const COLUMNS: { key: SortKey | null; label: string; numeric?: boolean }[] = [
  { key: null, label: "#" },
  { key: "industry", label: "Industry" },
  { key: "brand", label: "Brand / search theme" },
  { key: "commercial_volume", label: "Commercial searches", numeric: true },
  { key: "avg_commission", label: "Payout", numeric: true },
  { key: "serp_weakness", label: "SERP", numeric: true },
  { key: "score", label: "Score", numeric: true },
  { key: "risk_tier", label: "Risk" },
  { key: "revenue_expected", label: "Expected / mo", numeric: true },
  { key: "decision", label: "Decision" },
  { key: "status", label: "Status" },
];

function sortValue(o: Opportunity, key: SortKey): number | string {
  switch (key) {
    case "risk_tier":
      return RISK_ORDER[o.risk_tier];
    case "decision":
      return DECISION_ORDER[o.decision];
    case "industry":
    case "brand":
    case "status":
      return o[key].toLowerCase();
    default:
      return o[key];
  }
}

export function BoardView({ rows, industries, initial }: { rows: Opportunity[]; industries: string[]; initial: BoardFilters }) {
  const [f, setF] = useState<BoardFilters>(initial);
  const set = <K extends keyof BoardFilters>(k: K, v: BoardFilters[K]) => setF((prev) => ({ ...prev, [k]: v }));

  // Keep the URL in sync so filters survive refresh and can be shared
  const query = useMemo(() => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) {
      if (v && v !== EMPTY_FILTERS[k as keyof BoardFilters]) p.set(k, String(v));
    }
    return p.toString();
  }, [f]);
  useEffect(() => {
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [query]);

  const visible = useMemo(() => {
    const q = f.q.trim().toLowerCase();
    const min = Number(f.minScore) || 0;
    const out = rows.filter(
      (o) =>
        (!q || `${o.industry} ${o.brand} ${o.theme}`.toLowerCase().includes(q)) &&
        (!f.industry || o.industry === f.industry) &&
        (!f.risk || o.risk_tier === f.risk) &&
        (!f.decision || o.decision === f.decision) &&
        (!f.status || o.status === f.status) &&
        o.score >= min,
    );
    const mul = f.dir === "asc" ? 1 : -1;
    return out.sort((a, b) => {
      const av = sortValue(a, f.sort);
      const bv = sortValue(b, f.sort);
      const c = av < bv ? -1 : av > bv ? 1 : 0;
      return c * mul || b.score - a.score;
    });
  }, [rows, f]);

  const toggleSort = (key: SortKey, numeric?: boolean) =>
    setF((prev) =>
      prev.sort === key
        ? { ...prev, dir: prev.dir === "desc" ? "asc" : "desc" }
        : // numbers start highest-first, text starts A→Z
          { ...prev, sort: key, dir: numeric || key === "decision" ? "desc" : "asc" },
    );

  const build = visible.filter((o) => o.decision === "BUILD");
  const filtered = query.replace(/(^|&)(sort|dir)=[^&]*/g, "") !== "";
  const exportQs = new URLSearchParams(
    Object.entries({ q: f.q, industry: f.industry, risk: f.risk, decision: f.decision, minScore: f.minScore }).filter(([, v]) => v),
  ).toString();

  return (
    <>
      <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Opportunities" value={visible.length} hint={filtered ? `of ${rows.length} in the universe` : "Current ranked universe"} />
        <Kpi label="Build ready" value={build.length} hint="Score ≥ threshold, acceptable risk" />
        <Kpi label="Expected revenue" value={euro(build.reduce((a, b) => a + b.revenue_expected, 0))} hint="BUILD rows shown / month" />
        <Kpi label="Best score" value={visible.length ? Math.max(...visible.map((o) => o.score)).toFixed(1) : "–"} hint="Weighted opportunity score" />
      </section>

      <div className="my-4 flex flex-wrap items-center gap-2.5">
        <input
          className="field min-w-[220px] flex-1 sm:flex-none"
          placeholder="Search brand, industry or theme…"
          value={f.q}
          onChange={(e) => set("q", e.target.value)}
        />
        <select className="field" value={f.industry} onChange={(e) => set("industry", e.target.value)}>
          <option value="">All industries</option>
          {industries.map((i) => (
            <option key={i}>{i}</option>
          ))}
        </select>
        <select className="field" value={f.decision} onChange={(e) => set("decision", e.target.value)}>
          <option value="">All decisions</option>
          <option>BUILD</option>
          <option>REVIEW</option>
          <option>SKIP</option>
        </select>
        <select className="field" value={f.risk} onChange={(e) => set("risk", e.target.value)}>
          <option value="">All risk levels</option>
          <option value="green">Green risk</option>
          <option value="yellow">Yellow risk</option>
          <option value="red">Red risk</option>
        </select>
        <select className="field" value={f.minScore} onChange={(e) => set("minScore", e.target.value)}>
          <option value="">All scores</option>
          {[60, 70, 75, 80, 85].map((s) => (
            <option key={s} value={s}>
              Score {s}+
            </option>
          ))}
        </select>
        <select className="field" value={f.status} onChange={(e) => set("status", e.target.value)}>
          <option value="">All statuses</option>
          <option value="NEW">New</option>
          <option value="APPROVED">Approved</option>
          <option value="HANDED_OFF">Handed off</option>
          <option value="REJECTED">Rejected</option>
        </select>
        {filtered && (
          <button className="btn" onClick={() => setF({ ...EMPTY_FILTERS, sort: f.sort, dir: f.dir })}>
            Clear
          </button>
        )}
        <a className="btn sm:ml-auto" href={`/api/export${exportQs ? `?${exportQs}` : ""}`}>
          Export CSV
        </a>
      </div>

      <div className="overflow-auto rounded-2xl border border-line bg-[#0f1629]">
        <table className="w-full min-w-[1000px] border-collapse">
          <thead>
            <tr>
              {COLUMNS.map((c) => {
                const active = c.key === f.sort;
                return (
                  <th key={c.label} className="th" aria-sort={active ? (f.dir === "asc" ? "ascending" : "descending") : undefined}>
                    {c.key ? (
                      <button
                        className={`inline-flex items-center gap-1 whitespace-nowrap hover:text-white ${active ? "text-white" : ""}`}
                        onClick={() => toggleSort(c.key!, c.numeric)}
                      >
                        {c.label}
                        <span className={`text-[10px] ${active ? "text-accent" : "opacity-30"}`}>{active ? (f.dir === "asc" ? "▲" : "▼") : "↕"}</span>
                      </button>
                    ) : (
                      c.label
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((o, i) => (
              <tr key={o.id} className="group hover:bg-[#141f38]">
                <td className="td text-muted">{i + 1}</td>
                <td className="td">{o.industry}</td>
                <td className="td">
                  <Link href={`/opportunities/${o.id}`} className="block">
                    <strong className="group-hover:text-accent">{o.brand}</strong>
                    <div className="text-[#a7b3d1]">{o.theme}</div>
                  </Link>
                </td>
                <td className="td tabular-nums">
                  {num(o.commercial_volume)}
                  <span className="text-muted"> / {num(o.search_volume)}</span>
                </td>
                <td className="td tabular-nums">{euro(o.avg_commission)}</td>
                <td className="td tabular-nums">{o.serp_weakness >= 65 ? "Easy" : o.serp_weakness >= 45 ? "Medium" : "Hard"}</td>
                <td className="td text-[15px] font-extrabold tabular-nums">{o.score.toFixed(1)}</td>
                <td className="td">
                  <RiskPill risk={o.risk_tier} />
                </td>
                <td className="td tabular-nums">{euro(o.revenue_expected)}</td>
                <td className="td">
                  <DecisionPill decision={o.decision} />
                </td>
                <td className="td">
                  <StatusPill status={o.status} />
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td className="td py-10 text-center text-muted" colSpan={COLUMNS.length}>
                  No opportunities match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
