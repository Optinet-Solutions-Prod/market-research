import { connection } from "next/server";
import { ScoringForm } from "@/components/scoring-form";
import { PageHeader, StoreBanner } from "@/components/ui";
import { getStore } from "@/lib/db";

export default async function ScoringPage() {
  await connection();
  const store = getStore();
  const settings = await store.getSettings();
  return (
    <>
      <StoreBanner kind={store.kind} />
      <PageHeader
        title="Scoring Model"
        sub="Weights for the 100-point opportunity score and the gates for BUILD and handoff. Saving re-scores every stored opportunity from its saved signals."
      />
      <ScoringForm initial={settings} />
    </>
  );
}
