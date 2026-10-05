"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export function BoardFilters({ industries }: { industries: string[] }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    start(() => router.replace(`${path}?${next}`, { scroll: false }));
  };

  // Debounce free-text search
  useEffect(() => {
    if ((params.get("q") ?? "") === q) return;
    const t = setTimeout(() => set("q", q), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className={`my-4 flex flex-wrap gap-2.5 transition-opacity ${pending ? "opacity-60" : ""}`}>
      <input className="field min-w-[200px] flex-1 sm:flex-none" placeholder="Search industry or brand" value={q} onChange={(e) => setQ(e.target.value)} />
      <select className="field" value={params.get("industry") ?? ""} onChange={(e) => set("industry", e.target.value)}>
        <option value="">All industries</option>
        {industries.map((i) => (
          <option key={i}>{i}</option>
        ))}
      </select>
      <select className="field" value={params.get("risk") ?? ""} onChange={(e) => set("risk", e.target.value)}>
        <option value="">All risk levels</option>
        <option value="green">Green risk</option>
        <option value="yellow">Yellow risk</option>
        <option value="red">Red risk</option>
      </select>
      <select className="field" value={params.get("minScore") ?? ""} onChange={(e) => set("minScore", e.target.value)}>
        <option value="">All scores</option>
        {[60, 70, 75, 80, 85].map((s) => (
          <option key={s} value={s}>
            Score {s}+
          </option>
        ))}
      </select>
      <select className="field" value={params.get("decision") ?? ""} onChange={(e) => set("decision", e.target.value)}>
        <option value="">All decisions</option>
        <option>BUILD</option>
        <option>REVIEW</option>
        <option>SKIP</option>
      </select>
    </div>
  );
}
