import Link from "next/link";
import { connection } from "next/server";
import { PageHeader, Section, StatusPill, StoreBanner } from "@/components/ui";
import { getStore } from "@/lib/db";

export default async function HandoffsPage() {
  await connection();
  const store = getStore();
  const [handoffs, opps] = await Promise.all([store.listHandoffs(100), store.listOpportunities()]);
  const byId = new Map(opps.map((o) => [o.id, o]));
  const webhook = process.env.BUILD_WEBHOOK_URL;

  return (
    <>
      <StoreBanner kind={store.kind} />
      <PageHeader
        title="Build Handoff"
        sub="Approved opportunities sent to your domain → hosting → website system."
      />

      <div className="mb-4 grid gap-4 xl:grid-cols-2">
        <Section title="Delivery">
          <p className="text-sm">
            {webhook ? (
              <>
                Pushing to <code className="text-accent">{webhook}</code>
                {process.env.BUILD_WEBHOOK_SECRET ? " (HMAC-signed: X-Radar-Signature: sha256=…)" : " (unsigned — set BUILD_WEBHOOK_SECRET)"}
              </>
            ) : (
              <>
                No <code>BUILD_WEBHOOK_URL</code> set. Handoffs are <strong>queued</strong>; your build system can pull them from{" "}
                <code className="text-accent">GET /api/handoffs?status=queued</code>.
              </>
            )}
          </p>
        </Section>
        <Section title="Gates">
          <ul className="space-y-1 text-sm text-muted">
            <li>• Score ≥ BUILD threshold, legal and SEO risk below limits (Scoring Model)</li>
            <li>• Domain is GREEN and not registered — or YELLOW with confirmed trademark review</li>
            <li>• RED (exact-brand, alternate-TLD, typo) domains are never handed off</li>
          </ul>
        </Section>
      </div>

      <div className="overflow-auto rounded-2xl border border-line bg-[#0f1629]">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr>
              {["When", "Opportunity", "Domain", "Status", "Response / blockers"].map((h) => (
                <th key={h} className="th">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {handoffs.map((h) => {
              const o = byId.get(h.opportunity_id);
              const blockers = (h.payload as { blockers?: string[] })?.blockers;
              return (
                <tr key={h.id}>
                  <td className="td text-xs text-muted">{new Date(h.created_at).toLocaleString()}</td>
                  <td className="td">
                    {o ? (
                      <Link className="hover:text-accent" href={`/opportunities/${o.id}`}>
                        <strong>{o.brand}</strong> <span className="text-muted">· {o.industry}</span>
                      </Link>
                    ) : (
                      <span className="text-muted">deleted</span>
                    )}
                  </td>
                  <td className="td">
                    <code>{h.domain || "–"}</code>
                  </td>
                  <td className="td">
                    <StatusPill status={h.status} />
                  </td>
                  <td className="td max-w-md text-xs text-muted">{blockers?.join(", ") ?? h.response}</td>
                </tr>
              );
            })}
            {handoffs.length === 0 && (
              <tr>
                <td className="td text-muted" colSpan={5}>
                  Nothing handed off yet. Open a BUILD opportunity and send an available GREEN domain.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
