
export interface ApprovalStrategy {
  reason?: string;
  strategy?: string;
  expectedOutcome?: string;
  priority?: string;
  requiresApproval?: boolean;
}

export interface MessageDraft {
  message?: string;
  subject?: string;
  [key: string]: unknown;
}

export interface ApprovalPayload {
  title?: string;
  customerName?: string;
  priority?: "high" | "medium" | "low";
  priorityScore?: number;
  aiModel?: string | null;
  aiStrategy?: ApprovalStrategy | null;
  strategySource?: string;
  recommendedAction?: string;
  executionMode?: string;
  executionAllowed?: boolean;
  marketingConsent?: boolean;
  requiresApproval?: boolean;
  guardrailTriggered?: boolean;
  messageDraft?: MessageDraft | string | null;
}

export interface ApprovalAction {
  id: string;
  business_id: string;
  run_id: string;
  plan_id: string;
  customer_id: string;
  action_type: string;
  channel: string;
  payload: ApprovalPayload;
  rationale: string | null;
  expected_outcome: string | null;
  status: string;
  created_at: string;
  approved_by?: string | null;
approved_at?: string | null;
executed_at?: string | null;
}

export interface ApprovalsListResponse {
  success: boolean;
  message: string;
  data: ApprovalAction[];
  total: number;
}

export type ApprovalDecision = "approved" | "rejected";


export interface ApprovalDecisionRequest {
  businessId: string;
  decision: "approved" | "rejected";
  approvedBy: string;
  reason?: string | null;
}


export interface GenerateMessageDraftRequest {
  businessId: string;
  customerId: string;
}


export interface GenerateMessageDraftResponse {
  success: boolean;
  message: string;
  data: {
    businessId: string;
    customerId: string;
    actionId: string;
    customerName: string;
    draft: string;
    draftPersisted: boolean;
    actionStatus: string;
    strategySource: string;
    guardrailTriggered: boolean;
    requiresApproval: boolean;
    executionAllowed: boolean;
    executionMode: string;
    provider: string;
    model: string;
    latencyMs: number;
    usage?: {
      promptTokens?: number;
      completionTokens?: number;
    };
    generatedAt: string;
  };
}


export interface ApprovalDecisionResponse {
  success: boolean;
  message: string;
  auditLogged: boolean;
  action: ApprovalAction;
  runLifecycle: unknown | null;
  warning?: string;
}

