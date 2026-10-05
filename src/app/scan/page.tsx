import { connection } from "next/server";
import { ScanForm } from "@/components/scan-form";
import { PageHeader, Pill, Section, StoreBanner } from "@/components/ui";
import { getStore } from "@/lib/db";
import { dataForSeoConfigured, LOCATIONS } from "@/lib/providers/dataforseo";

export default async function ScanPage() {
  await connection();
  const store = getStore();
  const [industries, scans] = await Promise.all([store.listIndustries(), store.listScans(15)]);

  return (
    <>
      <StoreBanner kind={store.kind} />
      <PageHeader
        title="Run Cross-Industry Scan"
        sub="Industry → brands → keyword ecosystem → SERPs → affiliate economics → domains → risk → score."
      />
      <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
        <ScanForm
          industries={industries.filter((i) => i.active).map((i) => i.name)}
          geos={Object.keys(LOCATIONS)}
          liveReady={dataForSeoConfigured()}
        />
        <Section title="Recent scans">
          {scans.length === 0 ? (
            <p className="text-sm text-muted">No scans yet.</p>
          ) : (
            <table className="w-full">
              <tbody>
                {scans.map((s) => (
                  <tr key={s.id}>
                    <td className="td">
                      <div className="font-semibold">{s.industries.length ? s.industries.join(", ") : "All industries"}</div>
                      <div className="text-xs text-muted">
                        {new Date(s.started_at).toLocaleString()} · {s.mode} · {s.geo}
                      </div>
                    </td>
                    <td className="td text-right text-xs tabular-nums">
                      {s.opportunities_found}/{s.brands_scanned} brands
                    </td>
                    <td className="td text-right">
                      <Pill tone={s.status === "done" ? "green" : s.status === "failed" ? "red" : "blue"}>{s.status.toUpperCase()}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>
    </>
  );
}
