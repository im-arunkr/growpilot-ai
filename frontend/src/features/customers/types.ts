
export type RetentionStatus =
  | "active"
  | "declining"
  | "inactive"
  | "no_activity";

export interface RetentionCustomer {
  customerId: string;
  customerName: string;
  customerReference: string;
  status: RetentionStatus;
  inactiveDays: number | null;
  lastTransactionDate: string | null;
  totalTransactions: number;
  totalRevenue: number;
  marketingConsent: boolean;
  needsAttention: boolean;
}

export interface RetentionSummary {
  totalCustomers: number;
  active: number;
  declining: number;
  inactive: number;
  noActivity: number;
  atRisk: number;
}

export interface RetentionRules {
  ACTIVE_DAYS: number;
  DECLINING_DAYS: number;
}

export interface CustomerRetentionData {
  business: {
    id: string;
    name: string;
  };
  summary: RetentionSummary;
  retentionRules: RetentionRules;
  customers: RetentionCustomer[];
  generatedAt: string;
}

export interface CustomerRetentionResponse {
  success: boolean;
  message: string;
  data: CustomerRetentionData;
}
