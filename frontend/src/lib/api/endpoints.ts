
export const API_ENDPOINTS = {
  health: "/health/database",

  businesses: "/businesses",

  dashboard: {
    summary: "/dashboard/summary",
  },

  analytics: "/analytics",

  customers: {
    list: "/customers",
    retention: "/customers/retention/analysis",
  },

  agent: {
    run: "/agent/run",
    history: "/agent/history",
    models: "/agent/models/status",
    insights: "/agent/insights",
    retentionStrategy: "/agent/retention-strategy",
    messageDraft: "/agent/message-draft",
    evaluation: (runId: string) =>
      `/agent/${encodeURIComponent(runId)}/evaluation`,
  },

  approvals: {
    list: "/approvals",
    detail: (actionId: string) =>
      `/approvals/${encodeURIComponent(actionId)}`,
    decision: (actionId: string) =>
      `/approvals/${encodeURIComponent(actionId)}/decision`,
    execute: (actionId: string) =>
      `/approvals/${encodeURIComponent(actionId)}/execute`,
    recover: (actionId: string) =>
      `/approvals/${encodeURIComponent(actionId)}/recover`,
  },
} as const;
