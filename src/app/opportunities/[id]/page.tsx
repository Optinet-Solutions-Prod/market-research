import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DomainTable } from "@/components/domain-table";
import { StatusButtons } from "@/components/status-buttons";
import { Bar, DecisionPill, Metric, Pill, RiskPill, Section, StatusPill, euro, num, pct } from "@/components/ui";
import { getStore } from "@/lib/db";
import { handoffBlockers, SIGNAL_LABELS } from "@/lib/engine/scoring";
import type { SerpResult, Signals } from "@/lib/types";

const INVERTED = new Set<keyof Signals>(["seo_risk", "legal_risk"]);

export default async function OpportunityPage({ params }: PageProps<"/opportunities/[id]">) {
  await connection();
  const { id } = await params;
  const store = getStore();
  const o = await store.getOpportunity(id);
  if (!o) notFound();
  const [domains, keywords, serp, settings] = await Promise.all([
    store.listDomains(id),
    store.listKeywords(o.brand_id, o.geo),
    store.listSerp(o.brand_id, o.geo),
    store.getSettings(),
  ]);
  const blockers = handoffBlockers(o, settings.thresholds);
  const r = o.rationale;

  const serpByKeyword = new Map<string, SerpResult[]>();
  for (const s of serp) serpByKeyword.set(s.keyword, [...(serpByKeyword.get(s.keyword) ?? []), s]);

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-muted hover:text-white">
        ← Opportunity board
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-extrabold">{o.brand}</h1>
            <DecisionPill decision={o.decision} />
            <RiskPill risk={o.risk_tier} />
            <StatusPill status={o.status} />
          </div>
          <p className="mt-1 text-sm text-muted">
            {o.industry} · {o.theme} · {o.geo} · updated {new Date(o.updated_at).toLocaleString()}
          </p>
        </div>
        <StatusButtons id={o.id} status={o.status} />
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
        <Metric label="Opportunity score" value={o.score.toFixed(1)} />
        <Metric label="Commercial searches" value={num(o.commercial_volume)} sub={`of ${num(o.search_volume)} total (${pct(o.commercial_share)})`} />
        <Metric label="Expected rank" value={`#${o.expected_rank}`} sub={`CTR ${pct(o.ctr)}`} />
        <Metric label="Avg commission" value={euro(o.avg_commission)} sub={`merchant CVR ${pct(o.merchant_conversion)}`} />
        <Metric label="Expected revenue" value={euro(o.revenue_expected)} sub="per month at steady state" />
        <Metric label="Break-even" value={o.break_even_months ? `${o.break_even_months} mo` : "> 36 mo"} sub={`${euro(r.budget.build_eur)} build + ${euro(r.budget.monthly_eur)}/mo`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Why it was selected">
          <ul className="space-y-1.5 text-sm">
            {r.highlights.length ? r.highlights.map((h) => <li key={h}>✓ {h}</li>) : <li className="text-muted">No standout signals.</li>}
          </ul>
          <h3 className="mt-4 mb-1.5 text-xs font-bold text-muted uppercase">Risks</h3>
          <ul className="space-y-1.5 text-sm text-[#ffc9cd]">
            {r.risks.map((h) => (
              <li key={h}>! {h}</li>
            ))}
          </ul>
        </Section>

        <Section title="Signal breakdown">
          {(Object.keys(SIGNAL_LABELS) as (keyof Signals)[]).map((k) => (
            <Bar key={k} label={`${SIGNAL_LABELS[k]} (${settings.weights[k]})`} value={INVERTED.has(k) ? 100 - o[k] : o[k]} />
          ))}
        </Section>

        <Section title="Revenue model">
          <div className="grid grid-cols-3 gap-2.5">
            <Metric label="Conservative" value={euro(o.revenue_conservative)} />
            <Metric label="Expected" value={euro(o.revenue_expected)} />
            <Metric label="Aggressive" value={euro(o.revenue_aggressive)} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-4">
            <Funnel label="Commercial searches" value={num(r.funnel.commercial_searches)} />
            <Funnel label={`Visitors (rank #${o.expected_rank})`} value={num(r.funnel.visitors)} />
            <Funnel label={`Affiliate clicks (${pct(o.affiliate_click_rate)})`} value={num(r.funnel.affiliate_clicks)} />
            <Funnel label="Conversions" value={r.funnel.conversions.toFixed(1)} />
          </div>
        </Section>

        <Section title="Affiliate programs to monetise" aside={<span className="text-xs text-muted">€ per conversion</span>}>
          {r.programs.length ? (
            <table className="w-full">
              <tbody>
                {r.programs.map((p) => (
                  <tr key={`${p.merchant}-${p.network}`}>
                    <td className="td font-semibold">{p.merchant}</td>
                    <td className="td text-muted">{p.network}</td>
                    <td className="td">
                      <Pill tone="gray">{p.model}</Pill>
                    </td>
                    <td className="td text-right tabular-nums">{euro(p.value_eur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted">No competitor program permits comparison content. Add programs on the Catalog page.</p>
          )}
        </Section>
      </div>

      <Section
        title="Domain research"
        aside={
          blockers.length ? (
            <span className="text-xs text-[#ff9ca3]">Handoff blocked: {blockers.join(", ")}</span>
          ) : (
            <span className="text-xs text-good">Eligible for handoff</span>
          )
        }
      >
        <DomainTable opportunityId={o.id} domains={domains} blocked={blockers.length > 0 || o.status === "HANDED_OFF" || o.status === "REJECTED"} />
      </Section>

      <div className="grid gap-4 xl:grid-cols-2">
        <Section title="Keyword ecosystem">
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="th">Keyword</th>
                  <th className="th">Intent</th>
                  <th className="th text-right">Volume</th>
                  <th className="th text-right">CPC</th>
                </tr>
              </thead>
              <tbody>
                {[...keywords]
                  .sort((a, b) => b.volume - a.volume)
                  .map((k) => (
                    <tr key={k.keyword}>
                      <td className="td">{k.keyword}</td>
                      <td className="td">
                        <Pill tone={k.intent === "comparison" ? "green" : k.intent === "navigational" ? "gray" : k.intent === "transactional" ? "yellow" : "blue"}>
                          {k.intent}
                        </Pill>
                      </td>
                      <td className="td text-right tabular-nums">{num(k.volume)}</td>
                      <td className="td text-right tabular-nums text-muted">{k.cpc_eur != null ? `€${k.cpc_eur.toFixed(2)}` : "–"}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="SERP snapshot">
          <div className="max-h-[420px] space-y-4 overflow-auto pr-1">
            {[...serpByKeyword.entries()].map(([kw, rows]) => (
              <div key={kw}>
                <div className="mb-1 text-sm font-semibold">“{kw}”</div>
                <ol className="space-y-0.5 text-xs">
                  {rows
                    .sort((a, b) => a.position - b.position)
                    .map((s) => (
                      <li key={s.position} className="flex items-center gap-2">
                        <span className="w-5 text-right text-muted tabular-nums">{s.position}</span>
                        <span className="truncate">{s.domain}</span>
                        <span className="ml-auto">
                          <Pill tone={s.kind === "official" || s.kind === "review_platform" ? "red" : s.kind === "ugc" || s.kind === "video" ? "green" : "gray"}>
                            {s.kind.replace("_", " ")}
                          </Pill>
                        </span>
                      </li>
                    ))}
                </ol>
              </div>
            ))}
            {serpByKeyword.size === 0 && <p className="text-sm text-muted">No SERPs captured.</p>}
          </div>
        </Section>

        <Section title="Recommended site structure">
          <ul className="space-y-1.5 font-mono text-xs text-[#c8d2eb]">
            {r.site_structure.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Section>

        <Section title="SEO strategy">
          <ul className="space-y-1.5 text-sm">
            {r.seo_strategy.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Competitors analysed: {r.competitors.join(", ")}</p>
        </Section>
      </div>
    </div>
  );
}

function Funnel({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted">{label}</div>
      <div className="font-bold tabular-nums">{value}</div>
    </div>
  );
}
