import type { DomainRisk, RiskTier } from "@/lib/types";

export const euro = (n: number | null | undefined) =>
  new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n ?? 0);
export const num = (n: number | null | undefined) => new Intl.NumberFormat("en-US").format(Math.round(n ?? 0));
export const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const PILL = {
  green: "bg-[#14352d] text-[#72e5b8]",
  yellow: "bg-[#413719] text-[#ffd86b]",
  red: "bg-[#45212a] text-[#ff9ca3]",
  blue: "bg-[#1a2a52] text-[#a9c1ff]",
  gray: "bg-[#1f2740] text-[#b8c3e0]",
};

export function Pill({ tone, children }: { tone: keyof typeof PILL; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-[11px] font-extrabold tracking-wide whitespace-nowrap ${PILL[tone]}`}>
      {children}
    </span>
  );
}

export function RiskPill({ risk }: { risk: RiskTier | DomainRisk }) {
  return <Pill tone={risk.toLowerCase() as "green" | "yellow" | "red"}>{risk.toUpperCase()}</Pill>;
}

export function DecisionPill({ decision }: { decision: string }) {
  return <Pill tone={decision === "BUILD" ? "green" : decision === "REVIEW" ? "yellow" : "gray"}>{decision}</Pill>;
}

export function StatusPill({ status }: { status: string }) {
  const tone = status === "HANDED_OFF" || status === "sent" ? "blue" : status === "REJECTED" || status === "failed" || status === "blocked" ? "red" : status === "APPROVED" ? "green" : "gray";
  return <Pill tone={tone}>{status.replace("_", " ")}</Pill>;
}

export function Kpi({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="mt-2 text-[27px] font-extrabold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}

export function Metric({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-[#121b31] p-3">
      <span className="block text-[11px] text-muted">{label}</span>
      <strong className="text-lg tabular-nums">{value}</strong>
      {sub && <span className="block text-[11px] text-muted">{sub}</span>}
    </div>
  );
}

export function Bar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="my-2 grid grid-cols-[130px_1fr_36px] items-center gap-2 text-xs text-[#c8d2eb] sm:grid-cols-[160px_1fr_42px]">
      <div>{label}</div>
      <div className="h-2 overflow-hidden rounded-full bg-[#202943]">
        <div className="h-full bg-gradient-to-r from-[#5f86ff] to-accent-2" style={{ width: `${v}%` }} />
      </div>
      <div className="text-right tabular-nums">{Math.round(value)}</div>
    </div>
  );
}

export function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="card min-w-0">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold sm:text-[28px]">{title}</h1>
        {sub && <p className="mt-1.5 text-sm text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}

export function StoreBanner({ kind }: { kind: "supabase" | "memory" }) {
  if (kind === "supabase") return null;
  return (
    <div className="mb-5 rounded-xl border border-[#4a3d1a] bg-[#2a2412] px-4 py-3 text-sm text-[#ffe39a]">
      Running on the in-memory demo store — data resets when the server restarts. Set <code>SUPABASE_URL</code> and{" "}
      <code>SUPABASE_SERVICE_ROLE_KEY</code> in <code>.env.local</code> to persist.
    </div>
  );
}
