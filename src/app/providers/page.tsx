import { connection } from "next/server";
import { PageHeader, Pill, Section } from "@/components/ui";
import { providerStatus } from "@/lib/providers";

export default async function ProvidersPage() {
  await connection();
  const providers = providerStatus();
  return (
    <>
      <PageHeader title="Data Providers" sub="Live connectors are configured through environment variables in .env.local (or your host's env settings)." />
      <div className="grid gap-4 lg:grid-cols-2">
        {providers.map((p) => (
          <Section key={p.name} title={p.name} aside={<Pill tone={p.configured ? "green" : "gray"}>{p.configured ? "CONNECTED" : "NOT SET"}</Pill>}>
            <p className="text-sm text-muted">{p.role}</p>
            {p.env.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.env.map((e) => (
                  <code key={e} className="rounded-md border border-line bg-[#0b1222] px-2 py-0.5 text-xs">
                    {e}
                  </code>
                ))}
              </div>
            )}
            {p.docs && (
              <a href={p.docs} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs text-accent hover:underline">
                Docs →
              </a>
            )}
          </Section>
        ))}
        <Section title="Affiliate networks" aside={<Pill tone="yellow">MANUAL</Pill>}>
          <p className="text-sm text-muted">
            Impact, Awin, CJ, PartnerStack and Rakuten don&apos;t expose a common &quot;all programs with payouts&quot; API, and terms
            (brand-bidding, comparison content, geos) live in each program&apos;s agreement. Program economics are therefore kept in the
            Catalog and read from the <code>affiliate_programs</code> table. Keep it current from your network dashboards.
          </p>
        </Section>
      </div>
    </>
  );
}
