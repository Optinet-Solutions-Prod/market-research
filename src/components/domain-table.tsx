"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { handoffAction } from "@/app/actions";
import type { DomainCandidate } from "@/lib/types";
import { RiskPill } from "./ui";

const ORDER = { GREEN: 0, YELLOW: 1, RED: 2 };

export function DomainTable({ opportunityId, domains, blocked }: { opportunityId: string; domains: DomainCandidate[]; blocked: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const sorted = [...domains].sort((a, b) => ORDER[a.risk] - ORDER[b.risk] || b.quality - a.quality);

  function send(d: DomainCandidate) {
    let reviewed = false;
    if (d.risk === "YELLOW") {
      reviewed = window.confirm(
        `${d.domain} contains a brand name. Confirm a trademark review has been done and the site will be clearly comparative/editorial.`,
      );
      if (!reviewed) return;
    }
    start(async () => {
      const res = await handoffAction({ opportunityId, domain: d.domain, trademarkReviewed: reviewed });
      setMsg(
        res.ok
          ? { ok: true, text: `Handed off ${d.domain} (${res.status}). ${res.response ?? ""}` }
          : { ok: false, text: `Blocked: ${res.blockers.join(", ")}` },
      );
      router.refresh();
    });
  }

  return (
    <>
      <div className="overflow-auto">
        <table className="w-full min-w-[640px]">
          <thead>
            <tr>
              <th className="th">Domain</th>
              <th className="th">Risk</th>
              <th className="th">Availability</th>
              <th className="th text-right">Quality</th>
              <th className="th" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((d) => (
              <tr key={d.domain}>
                <td className="td">
                  <code className="text-white">{d.domain}</code>
                  <div className="text-xs text-muted">{d.reason}</div>
                </td>
                <td className="td">
                  <RiskPill risk={d.risk} />
                </td>
                <td className="td text-xs">
                  {d.risk === "RED" ? (
                    <span className="text-muted">not checked</span>
                  ) : d.available === true ? (
                    <span className="text-good">available</span>
                  ) : d.available === false ? (
                    <span className="text-[#ff9ca3]">registered</span>
                  ) : (
                    <span className="text-muted">unknown</span>
                  )}
                </td>
                <td className="td text-right tabular-nums">{d.quality}</td>
                <td className="td text-right">
                  {d.risk !== "RED" && d.available !== false && (
                    <button className="btn btn-good px-2.5 py-1.5 text-xs" disabled={blocked || pending} onClick={() => send(d)}>
                      Send to build
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-good" : "text-[#ff9ca3]"}`}>{msg.text}</p>}
    </>
  );
}
