import { connection } from "next/server";
import { addBrandAction, addIndustryAction, addProgramAction } from "@/app/actions";
import { DeleteButton } from "@/components/delete-button";
import { SeedButton } from "@/components/seed-button";
import { PageHeader, Pill, Section, StoreBanner, euro } from "@/components/ui";
import { getStore } from "@/lib/db";
import { programValue } from "@/lib/engine/signals";

export default async function CatalogPage() {
  await connection();
  const store = getStore();
  const [industries, brands, programs] = await Promise.all([store.listIndustries(), store.listBrands(), store.listPrograms()]);

  return (
    <>
      <StoreBanner kind={store.kind} />
      <PageHeader
        title="Catalog"
        sub="The research universe: industries, the brands whose search ecosystems we analyse, and the affiliate programs we can monetise."
        actions={store.kind === "supabase" ? <SeedButton /> : undefined}
      />

      <div className="mb-4 grid gap-4 xl:grid-cols-3">
        <Section title="Add industry">
          <form action={addIndustryAction} className="grid gap-2.5">
            <input name="name" className="field" placeholder="e.g. Business Banking" required />
            <input name="conversion" className="field" type="number" step="0.001" min="0" max="1" placeholder="Default merchant conversion (0.04)" />
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" name="regulated" /> Regulated / YMYL (finance, health, legal, gambling)
            </label>
            <button className="btn">Add industry</button>
          </form>
        </Section>

        <Section title="Add brand">
          <form action={addBrandAction} className="grid gap-2.5">
            <select name="industry_id" className="field" required>
              {industries.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <input name="name" className="field" placeholder="Brand name" required />
            <input name="domain" className="field" placeholder="Official domain (brand.com)" />
            <input name="geos" className="field" placeholder="Markets: US, UK, DE" />
            <button className="btn">Add brand</button>
          </form>
        </Section>

        <Section title="Add affiliate program">
          <form action={addProgramAction} className="grid grid-cols-2 gap-2.5">
            <select name="industry_id" className="field col-span-2" required>
              {industries.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <input name="merchant" className="field" placeholder="Merchant" required />
            <input name="network" className="field" placeholder="Network (impact, awin…)" />
            <select name="model" className="field">
              <option>CPA</option>
              <option>CPL</option>
              <option>REVSHARE</option>
              <option>RECURRING</option>
            </select>
            <input name="payout_eur" className="field" type="number" step="0.01" placeholder="Payout €" />
            <input name="revshare_pct" className="field" type="number" step="0.1" placeholder="Rev share %" />
            <input name="avg_order_eur" className="field" type="number" step="0.01" placeholder="Avg order €" />
            <input name="recurring_months" className="field" type="number" placeholder="Recurring months" />
            <input name="conversion_rate" className="field" type="number" step="0.001" placeholder="Conversion (0.05)" />
            <input name="geos" className="field col-span-2" placeholder="Markets: US, UK, DE" />
            <label className="col-span-2 flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" name="allows_competitor_comparison" defaultChecked /> Allows comparison/review content
            </label>
            <label className="col-span-2 flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" name="allows_brand_keywords" /> Allows targeting its brand keywords
            </label>
            <button className="btn col-span-2">Add program</button>
          </form>
        </Section>
      </div>

      <div className="space-y-4">
        {industries.map((ind) => {
          const b = brands.filter((x) => x.industry_id === ind.id);
          const p = programs.filter((x) => x.industry_id === ind.id);
          return (
            <Section
              key={ind.id}
              title={ind.name}
              aside={
                <div className="flex gap-2">
                  {ind.regulated && <Pill tone="yellow">REGULATED</Pill>}
                  <Pill tone="gray">CVR {(ind.default_conversion * 100).toFixed(1)}%</Pill>
                </div>
              }
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <div className="label mb-2">Brands ({b.length})</div>
                  <div className="flex flex-wrap gap-2">
                    {b.map((x) => (
                      <span key={x.id} className="inline-flex items-center gap-2 rounded-lg border border-line bg-[#111a2e] py-1 pr-1 pl-2.5 text-sm">
                        {x.name}
                        <span className="text-xs text-muted">{x.geos.join(" ")}</span>
                        <DeleteButton kind="brand" id={x.id} />
                      </span>
                    ))}
                  </div>
                </div>
                <div className="overflow-auto">
                  <div className="label mb-2">Affiliate programs ({p.length})</div>
                  <table className="w-full min-w-[420px]">
                    <tbody>
                      {p.map((x) => (
                        <tr key={x.id}>
                          <td className="td font-semibold">{x.merchant}</td>
                          <td className="td text-muted">{x.network}</td>
                          <td className="td">
                            <Pill tone="gray">{x.model}</Pill>
                          </td>
                          <td className="td text-right tabular-nums" title="€ value per conversion">
                            {euro(programValue(x))}
                          </td>
                          <td className="td">{!x.allows_competitor_comparison && <Pill tone="red">NO COMPARISON</Pill>}</td>
                          <td className="td text-right">
                            <DeleteButton kind="program" id={x.id} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>
          );
        })}
      </div>
    </>
  );
}
