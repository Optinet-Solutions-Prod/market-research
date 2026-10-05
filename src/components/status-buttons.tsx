"use client";

import { useTransition } from "react";
import { setStatusAction } from "@/app/actions";
import type { OpportunityStatus } from "@/lib/types";

export function StatusButtons({ id, status }: { id: string; status: OpportunityStatus }) {
  const [pending, start] = useTransition();
  const set = (s: OpportunityStatus) => start(() => setStatusAction(id, s));
  if (status === "HANDED_OFF") return null;
  return (
    <div className="flex gap-2">
      {status !== "APPROVED" && (
        <button className="btn btn-good" disabled={pending} onClick={() => set("APPROVED")}>
          Approve
        </button>
      )}
      {status !== "REJECTED" ? (
        <button className="btn btn-bad" disabled={pending} onClick={() => set("REJECTED")}>
          Reject
        </button>
      ) : (
        <button className="btn" disabled={pending} onClick={() => set("NEW")}>
          Restore
        </button>
      )}
    </div>
  );
}
