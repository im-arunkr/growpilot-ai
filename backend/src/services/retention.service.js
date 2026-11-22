
import { supabase } from "../config/supabase.js";

// Customer retention configuration
const RETENTION_RULES = {
  ACTIVE_DAYS: 14,
  DECLINING_DAYS: 30,
};

const DAY_IN_MS = 24 * 60 * 60 * 1000;

// Fetch records with pagination
async function fetchAll(table, columns, businessId) {
  const pageSize = 1000;
  const records = [];

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .eq("business_id", businessId)
      .order("id", { ascending: true })
      .range(start, start + pageSize - 1);

    if (error) throw error;

    records.push(...data);

    if (data.length < pageSize) break;
  }

  return records;
}

// Calculate inactivity using UTC calendar days
function calculateInactiveDays(lastTransactionDate, now) {
  if (!lastTransactionDate) return null;

  const date = new Date(lastTransactionDate);

  if (Number.isNaN(date.getTime())) return null;

  const todayUTC = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );

  const lastUTC = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  );

  return Math.max(
    0,
    Math.floor((todayUTC - lastUTC) / DAY_IN_MS)
  );
}

// Classify customer activity
function classifyCustomer(inactiveDays) {
  if (inactiveDays === null) return "no_activity";

  if (inactiveDays <= RETENTION_RULES.ACTIVE_DAYS) {
    return "active";
  }

  if (inactiveDays <= RETENTION_RULES.DECLINING_DAYS) {
    return "declining";
  }

  return "inactive";
}

// Main Retention Analysis
export async function getCustomerRetention(businessId) {
  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select("id, name")
      .eq("id", businessId)
      .maybeSingle();

  if (businessError) throw businessError;

  if (!business) {
    throw new Error("Business not found");
  }

  const [customers, transactions] = await Promise.all([
    fetchAll(
      "customers",
      "id, full_name, external_reference, marketing_consent",
      businessId
    ),
    fetchAll(
      "transactions",
      "id, customer_id, fee_revenue, status, occurred_at",
      businessId
    ),
  ]);

  const now = new Date();
  const historyMap = new Map();

  // Group completed transactions by customer
  for (const transaction of transactions) {
    if (transaction.status !== "completed") continue;

    const transactionDate = new Date(transaction.occurred_at);

    if (
      Number.isNaN(transactionDate.getTime()) ||
      transactionDate > now
    ) {
      continue;
    }

    const history = historyMap.get(transaction.customer_id) || {
      count: 0,
      revenue: 0,
      lastTransaction: null,
    };

    history.count += 1;
    history.revenue += Number(transaction.fee_revenue || 0);

    if (
      !history.lastTransaction ||
      transactionDate > new Date(history.lastTransaction)
    ) {
      history.lastTransaction = transaction.occurred_at;
    }

    historyMap.set(transaction.customer_id, history);
  }

  const summary = {
    totalCustomers: customers.length,
    active: 0,
    declining: 0,
    inactive: 0,
    noActivity: 0,
    atRisk: 0,
  };

  const customerAnalysis = customers.map((customer) => {
    const history = historyMap.get(customer.id);

    const inactiveDays = calculateInactiveDays(
      history?.lastTransaction,
      now
    );

    const status = classifyCustomer(inactiveDays);

    if (status === "no_activity") {
      summary.noActivity++;
    } else {
      summary[status]++;
    }

    if (status === "declining" || status === "inactive") {
      summary.atRisk++;
    }

    return {
      customerId: customer.id,
      customerName: customer.full_name,
      customerReference: customer.external_reference,
      status,
      inactiveDays,
      lastTransactionDate: history?.lastTransaction ?? null,
      totalTransactions: history?.count ?? 0,
      totalRevenue: Number((history?.revenue ?? 0).toFixed(2)),
      marketingConsent: customer.marketing_consent,
      needsAttention:
        status === "declining" || status === "inactive",
    };
  });

  // Prioritize customers needing attention
  const priority = {
    inactive: 0,
    declining: 1,
    no_activity: 2,
    active: 3,
  };

  customerAnalysis.sort((a, b) => {
    return (
      priority[a.status] - priority[b.status] ||
      (b.inactiveDays ?? 0) - (a.inactiveDays ?? 0)
    );
  });

  return {
    business,
    summary,
    retentionRules: RETENTION_RULES,
    customers: customerAnalysis,
    generatedAt: now.toISOString(),
  };
}
