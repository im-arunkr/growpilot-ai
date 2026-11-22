
export interface BusinessInfo {
  id: string;
  name: string;
  owner_name: string;
}

export interface BusinessMetrics {
  totalCustomers: number;
  totalTransactions: number;
  completedTransactions: number;
  totalRevenue: number;
  totalTransactionValue: number;
  customersWithCompletedTransactions: number;
}

export interface RetentionMetrics {
  totalCustomers: number;
  active: number;
  declining: number;
  inactive: number;
  noActivity: number;
  atRisk: number;
  atRiskPercentage: number;
}

export interface AgentMetrics {
  totalAgentRuns: number;
  totalActionPlans: number;
  totalActions: number;
  pendingApprovals: number;
  approvedActions: number;
  completedActions: number;
  rejectedActions: number;
  failedActions: number;
  executingActions: number;
  actionCompletionRate: number;
}

export interface RecentRun {
  id: string;
  goal_id: string;
  status: string;
  current_step: string | null;
  started_at: string;
}

export interface RecentActivity {
  id: number;
  run_id: string | null;
  action_id: string | null;
  event_type: string;
  severity: string;
  tool_name: string | null;
  created_at: string;
}

export interface LatestEvaluation {
  id: string;
  run_id: string;
  status: string;
  metric_name: string;
  actual_value: number;
  findings: string;
  recommendations: unknown[];
  evaluated_at: string;
}

export interface DashboardSummary {
  business: BusinessInfo;
  businessMetrics: BusinessMetrics;
  retentionMetrics: RetentionMetrics;
  agentMetrics: AgentMetrics;
  recentRuns: RecentRun[];
  recentActivity: RecentActivity[];
  latestEvaluation: LatestEvaluation | null;
  generatedAt: string;
}

export interface DashboardSummaryResponse {
  success: boolean;
  message: string;
  data: DashboardSummary;
}
