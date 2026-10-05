import type { Economics, Thresholds } from "@/lib/types";

/** Organic CTR by position (blended desktop/mobile, commercial SERPs). */
export const CTR_CURVE = [0.28, 0.15, 0.11, 0.08, 0.065, 0.052, 0.043, 0.036, 0.03, 0.025];

export const SCENARIO_MULTIPLIERS = { conservative: 0.55, expected: 1, aggressive: 1.75 };

/** Months a new site typically needs to reach its steady-state rank. */
const RAMP_MONTHS = 6;

export function ctrForRank(rank: number) {
  const i = Math.max(1, Math.min(CTR_CURVE.length, Math.round(rank))) - 1;
  return CTR_CURVE[i];
}

/** Weak SERPs let a new, genuinely useful site reach higher positions. */
export function expectedRank(serpWeakness: number) {
  return Math.max(1, Math.min(10, Math.round(1 + (100 - serpWeakness) / 10)));
}

export interface RevenueInput {
  commercialVolume: number;
  serpWeakness: number;
  conversionIntent: number; // 0-100
  merchantConversion: number; // 0-1
  avgCommission: number; // € per conversion
}

/**
 * Searches → rank → CTR → visitors → affiliate CTR → merchant conversion → commission.
 */
export function projectRevenue(input: RevenueInput, t: Thresholds) {
  const rank = expectedRank(input.serpWeakness);
  const ctr = ctrForRank(rank);
  const visitors = input.commercialVolume * ctr;
  const affiliateClickRate = round3(0.18 + 0.2 * (input.conversionIntent / 100));
  const clicks = visitors * affiliateClickRate;
  const conversions = clicks * input.merchantConversion;
  const expected = conversions * input.avgCommission;

  const economics: Economics = {
    expected_rank: rank,
    ctr,
    affiliate_click_rate: affiliateClickRate,
    merchant_conversion: input.merchantConversion,
    avg_commission: round2(input.avgCommission),
    revenue_conservative: round2(expected * SCENARIO_MULTIPLIERS.conservative),
    revenue_expected: round2(expected),
    revenue_aggressive: round2(expected * SCENARIO_MULTIPLIERS.aggressive),
    break_even_months: breakEvenMonths(expected, t),
  };

  return {
    economics,
    funnel: {
      commercial_searches: Math.round(input.commercialVolume),
      visitors: Math.round(visitors),
      affiliate_clicks: Math.round(clicks),
      conversions: Math.round(conversions * 10) / 10,
    },
  };
}

/** Linear traffic ramp to steady state over RAMP_MONTHS; null if it never pays back within 36 months. */
export function breakEvenMonths(steadyMonthly: number, t: Thresholds): number | null {
  let cumulative = -t.build_cost_eur;
  for (let m = 1; m <= 36; m++) {
    const ramp = Math.min(1, m / RAMP_MONTHS);
    cumulative += steadyMonthly * ramp - t.monthly_cost_eur;
    if (cumulative >= 0) return m;
  }
  return null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;
