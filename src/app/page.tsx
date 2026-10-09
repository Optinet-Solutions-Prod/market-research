import Link from "next/link";
import { connection } from "next/server";
import { BoardView } from "@/components/board-view";
import { QuickScanButton } from "@/components/quick-scan-button";
import { PageHeader, StoreBanner } from "@/components/ui";
import { EMPTY_FILTERS, SORT_KEYS, type BoardFilters } from "@/lib/board";
import { getStore } from "@/lib/db";

export default async function Board({ searchParams }: PageProps<"/">) {
  await connection();
  const params = await searchParams;
  const store = getStore();
  const [rows, industries] = await Promise.all([store.listOpportunities(), store.listIndustries()]);

  // Filtering and sorting happen client-side; the URL only seeds the initial state
  const initial: BoardFilters = { ...EMPTY_FILTERS };
  for (const key of Object.keys(EMPTY_FILTERS) as (keyof BoardFilters)[]) {
    const v = params[key];
    if (typeof v === "string" && v) (initial as unknown as Record<string, string>)[key] = v;
  }
  if (initial.dir !== "asc" && initial.dir !== "desc") initial.dir = "desc";
  if (!SORT_KEYS.includes(initial.sort)) initial.sort = "score";

  return (
    <>
      <StoreBanner kind={store.kind} />
      <PageHeader
        title="Cross-Industry Opportunity Board"
        sub="Abnormal gaps between commercial search demand, ranking difficulty, affiliate payout and risk."
        actions={
          <Link className="btn btn-primary" href="/scan">
            Run Scan
          </Link>
        }
      />

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
        <BoardView rows={rows} industries={industries.map((i) => i.name)} initial={initial} />
      )}
    </>
  );
}
