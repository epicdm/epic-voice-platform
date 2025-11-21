/**
 * User Statistics types
 * Maps to backend stats API responses (computed, not stored)
 */

/**
 * User stats (dashboard overview)
 */
export interface UserStats {
  total_agents: number;
  total_phone_numbers: number;
  total_calls_today: number;
  total_calls_month: number;
  total_cost_today_usd: number;
  total_cost_month_usd: number;
  active_calls: number; // Currently in-progress calls
}

/**
 * Call statistics (analytics page)
 */
export interface CallStats {
  total_calls: number;
  completed_calls: number;
  failed_calls: number;
  no_answer_calls: number;
  average_duration_seconds: number;
  total_duration_seconds: number;
  calls_by_day: CallsByDay[];
  calls_by_agent: CallsByAgent[];
}

/**
 * Calls by day data point
 */
export interface CallsByDay {
  date: string; // ISO date (YYYY-MM-DD)
  count: number;
  total_duration: number; // seconds
}

/**
 * Calls by agent data point
 */
export interface CallsByAgent {
  agent_id: string;
  agent_name: string;
  total_calls: number;
  avg_duration: number; // seconds
}

/**
 * Cost statistics (analytics page)
 */
export interface CostStats {
  total_cost_usd: number;
  llm_cost_usd: number;
  stt_cost_usd: number;
  tts_cost_usd: number;
  cost_by_day: CostByDay[];
  cost_by_agent: CostByAgent[];
}

/**
 * Cost by day data point
 */
export interface CostByDay {
  date: string; // ISO date (YYYY-MM-DD)
  total_cost: number;
  llm_cost: number;
  stt_cost: number;
  tts_cost: number;
}

/**
 * Cost by agent data point
 */
export interface CostByAgent {
  agent_id: string;
  agent_name: string;
  total_cost: number;
  call_count: number;
}

/**
 * Analytics period filter
 */
export type AnalyticsPeriod = "24h" | "7d" | "30d" | "90d";

/**
 * Helper functions for stats formatting
 */

/**
 * Format large numbers with abbreviations
 * @example formatNumber(1234) => "1.2K"
 */
export function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Format percentage
 * @example formatPercentage(0.87) => "87%"
 */
export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

/**
 * Calculate success rate from call stats
 */
export function calculateSuccessRate(stats: CallStats): number {
  if (stats.total_calls === 0) return 0;
  return stats.completed_calls / stats.total_calls;
}

/**
 * Calculate average cost per call
 */
export function calculateAvgCostPerCall(costStats: CostStats, callStats: CallStats): number {
  if (callStats.total_calls === 0) return 0;
  return costStats.total_cost_usd / callStats.total_calls;
}

/**
 * Get period label for display
 */
export function getPeriodLabel(period: AnalyticsPeriod): string {
  const labels: Record<AnalyticsPeriod, string> = {
    "24h": "Last 24 Hours",
    "7d": "Last 7 Days",
    "30d": "Last 30 Days",
    "90d": "Last 90 Days",
  };
  return labels[period];
}

/**
 * Cost breakdown percentages
 */
export function getCostBreakdown(stats: CostStats): {
  llm: number;
  stt: number;
  tts: number;
} {
  const total = stats.total_cost_usd;
  if (total === 0) {
    return { llm: 0, stt: 0, tts: 0 };
  }

  return {
    llm: stats.llm_cost_usd / total,
    stt: stats.stt_cost_usd / total,
    tts: stats.tts_cost_usd / total,
  };
}
