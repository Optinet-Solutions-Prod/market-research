// Shared by the server page (initial state from the URL) and the client board.

export type SortKey =
  | "score"
  | "industry"
  | "brand"
  | "commercial_volume"
  | "avg_commission"
  | "serp_weakness"
  | "risk_tier"
  | "revenue_expected"
  | "decision"
  | "status";

export const SORT_KEYS: SortKey[] = [
  "score", "industry", "brand", "commercial_volume", "avg_commission", "serp_weakness", "risk_tier", "revenue_expected", "decision", "status",
];

export interface BoardFilters {
  q: string;
  industry: string;
  risk: string;
  decision: string;
  status: string;
  minScore: string;
  sort: SortKey;
  dir: "asc" | "desc";
}

export const EMPTY_FILTERS: BoardFilters = {
  q: "",
  industry: "",
  risk: "",
  decision: "",
  status: "",
  minScore: "",
  sort: "score",
  dir: "desc",
};
