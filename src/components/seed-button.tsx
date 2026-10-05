"use client";

import { useState, useTransition } from "react";
import { seedCatalogAction } from "@/app/actions";

export function SeedButton() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="flex items-center gap-3">
      {msg && <span className="text-xs text-muted">{msg}</span>}
      <button
        className="btn"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await seedCatalogAction();
            setMsg(r.ok ? `Loaded ${r.industries} industries, ${r.brands} brands, ${r.programs} programs` : r.error);
          })
        }
      >
        {pending ? "Loading…" : "Load starter catalog"}
      </button>
    </div>
  );
}
