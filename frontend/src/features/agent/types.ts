
export type AgentGoal = "customer_retention";

export type AgentRunStatus =
  | "queued"
  | "running"
  | "awaiting_approval"
  | "waiting_approval"
  | "completed"
  | "failed"
  | "cancelled";

export interface AgentOpportunity {
  customerId: string;
  customerName: string;
  status: string;
  inactiveDays: number;
  lastTransactionDate: string | null;
  totalTransactions: number;
  historicalRevenue: number;
  priority: "high" | "medium" | "low";
  priorityScore: number;
  marketingConsent: boolean;
  recommendedAction: string;
}

export interface AIStrategy {
  reason: string;
  strategy: string;
  expectedOutcome: string;
  priority: "high" | "medium" | "low";
  requiresApproval: boolean;
}

export interface AgentAction {
  customerId: string;
  customerName: string;
  actionType: string;
  title: string;
  priority: "high" | "medium" | "low";
  priorityScore: number;
  rationale: string;
  objective: string;
  recommendedAction: string;
  expectedOutcome: string;
  channel: "simulation";
  requiresApproval: boolean;
  status: string;
  marketingConsent: boolean;
  executionAllowed: boolean;
  aiStrategy?: AIStrategy;
  strategySource?: string;
}

export interface AgentPlan {
  businessId: string;
  planType: string;
  title: string;
  objective: string;
  summary: {
    totalActions: number;
    highPriority: number;
    mediumPriority: number;
    lowPriority: number;
    pendingApproval: number;
  };
  actions: AgentAction[];
  requiresHumanApproval: boolean;
  executionMode: "simulation";
  status: string;
  generatedAt: string;
  aiMetadata?: {
    used: boolean;
    provider: string;
    model: string;
    latencyMs: number;
    strategySource: string;
    guardrailTriggered: boolean;
    fallbackReason?: string | null;
    aiEnhancedActions: number;
  };
}

export interface AgentStep {
  step: string;
  status: string;
  timestamp: string;
  tool?: string;
  reason?: string;
  count?: number;
  model?: string;
  durationMs?: number;
  latencyMs?: number;
  strategySource?: string;
  [key: string]: unknown;
}

export interface AgentRunRequest {
  businessId: string;
  goal: AgentGoal;
  limit: number;
}

export interface AgentRunResponse {
  success: boolean;
  runId: string;
  businessId: string;
  goal: string;
  status: AgentRunStatus;
  persisted: boolean;
  persistence?: {
    planId: string;
    goalId: string;
    savedActions: number;
    savedLogs: number;
    databaseStatus: string;
  };
  ai?: {
    enabled: boolean;
    provider: string;
    model: string;
    strategySource: string;
    latencyMs: number;
    guardrailTriggered: boolean;
    fallbackReason?: string | null;
    aiEnhancedActions: number;
  };
  availableTools?: string[];
  summary: {
    totalCustomers: number;
    atRiskCustomers: number;
    totalOpportunities: number;
    blockedOpenActionCustomers?: number;
    eligibleOpportunities?: number;
    returnedOpportunities: number;
  };
  opportunities: AgentOpportunity[];
  actionPlan: AgentPlan;
  steps: AgentStep[];
  durationMs: number;
  generatedAt: string;
}
