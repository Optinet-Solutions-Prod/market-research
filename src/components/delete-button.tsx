"use client";

import { useTransition } from "react";
import { deleteBrandAction, deleteProgramAction } from "@/app/actions";

export function DeleteButton({ kind, id }: { kind: "brand" | "program"; id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      aria-label={`Delete ${kind}`}
      disabled={pending}
      className="rounded-md px-1.5 text-muted hover:bg-[#371219] hover:text-bad disabled:opacity-40"
      onClick={() => {
        if (!window.confirm(`Delete this ${kind}?`)) return;
        start(() => (kind === "brand" ? deleteBrandAction(id) : deleteProgramAction(id)));
      }}
    >
      ×
    </button>
  );
}
