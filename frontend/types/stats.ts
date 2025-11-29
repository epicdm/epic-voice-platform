export interface DashboardStats {
  total_agents: number;
  total_phone_numbers: number;
  total_calls: number;
  total_minutes: number;
  active_calls?: number;
  pending_calls?: number;
}
