import Link from "next/link";
import { connection } from "next/server";
import { BoardFilters } from "@/components/board-filters";
import { QuickScanButton } from "@/components/quick-scan-button";
import { DecisionPill, Kpi, PageHeader, RiskPill, StatusPill, StoreBanner, euro, num } from "@/components/ui";
import { getStore } from "@/lib/db";
import { parseFilters } from "@/lib/filters";

export default async function Board({ searchParams }: PageProps<"/">) {
  await connection();
  const params = await searchParams;
  const filters = parseFilters(params);
  const store = getStore();
  const [rows, industries] = await Promise.all([store.listOpportunities(filters), store.listIndustries()]);

  const build = rows.filter((o) => o.decision === "BUILD");
  const exportQs = new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) => (typeof v === "string" && v ? [[k, v]] : [])),
  ).toString();

  return (
    <>
      <StoreBanner kind={store.kind} />
      <PageHeader
        title="Cross-Industry Opportunity Board"
        sub="Abnormal gaps between commercial search demand, ranking difficulty, affiliate payout and risk."
        actions={
          <>
            <a className="btn" href={`/api/export${exportQs ? `?${exportQs}` : ""}`}>
              Export CSV
            </a>
            <Link className="btn btn-primary" href="/scan">
              Run Scan
            </Link>
          </>
        }
      />

      <section className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Opportunities" value={rows.length} hint="Current ranked universe" />
        <Kpi label="Build ready" value={build.length} hint="Score ≥ threshold, acceptable risk" />
        <Kpi label="Expected revenue" value={euro(build.reduce((a, b) => a + b.revenue_expected, 0))} hint="BUILD portfolio / month" />
        <Kpi label="Best score" value={rows.length ? Math.max(...rows.map((o) => o.score)).toFixed(1) : "–"} hint="Weighted opportunity score" />
      </section>

      <BoardFilters industries={industries.map((i) => i.name)} />

      {rows.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 py-14 text-center">
          <div className="text-lg font-bold">No opportunities yet</div>
          <p className="max-w-md text-sm text-muted">
            Run a scan to analyse every brand in the catalog. Demo mode uses synthetic market data so you can see the
            whole pipeline without API keys.
          </p>
          <QuickScanButton />
        </div>
      ) : (
        <div className="overflow-auto rounded-2xl border border-line bg-[#0f1629]">
          <table className="w-full min-w-[1000px] border-collapse">
            <thead>
              <tr>
                {["#", "Industry", "Brand / search theme", "Commercial searches", "Payout", "SERP", "Score", "Risk", "Expected / mo", "Decision", "Status"].map((h) => (
                  <th key={h} className="th">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((o, i) => (
                <tr key={o.id} className="group cursor-pointer hover:bg-[#141f38]">
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
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
