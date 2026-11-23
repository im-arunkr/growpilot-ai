
import { supabase } from "../config/supabase.js";

/**
 * GrowPilot AI — Goal Progress Engine
 *
 * Calculates business goal progress using
 * completed transactions.
 *
 * Supported metrics:
 * - repeat_customer_rate (%)
 * - monthly_fee_revenue (INR)
 *
 * No synthetic improvement is invented.
 */

const SUPPORTED_METRICS = [
  "repeat_customer_rate",
  "monthly_fee_revenue",
];

function round(value, decimals = 2) {
  const factor = 10 ** decimals;

  return Math.round(
    (value + Number.EPSILON) * factor
  ) / factor;
}

function getMeasurementWindow() {
  const end = new Date();

  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 30);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

async function fetchCompletedTransactions({
  businessId,
  start,
  end,
}) {
  const transactions = [];
  const pageSize = 1000;

  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("transactions")
      .select(
        "id, customer_id, fee_revenue, occurred_at"
      )
      .eq("business_id", businessId)
      .eq("status", "completed")
      .gte("occurred_at", start)
      .lt("occurred_at", end)
      .order("occurred_at", {
        ascending: true,
      })
      .order("id", {
        ascending: true,
      })
      .range(
        offset,
        offset + pageSize - 1
      );

    if (error) throw error;

    transactions.push(...(data ?? []));

    if (!data || data.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return transactions;
}

function calculateRepeatCustomerRate(transactions) {
  const customerCounts = new Map();

  for (const transaction of transactions) {
    const customerId = transaction.customer_id;

    if (!customerId) continue;

    customerCounts.set(
      customerId,
      (customerCounts.get(customerId) ?? 0) + 1
    );
  }

  const activeCustomers = customerCounts.size;

  const repeatCustomers = [
    ...customerCounts.values(),
  ].filter((count) => count >= 2).length;

  const rate = activeCustomers > 0
    ? (repeatCustomers / activeCustomers) * 100
    : null;

  return {
    value: rate === null
      ? null
      : round(rate),
    unit: "percent",
    activeCustomers,
    repeatCustomers,
  };
}

function calculateMonthlyFeeRevenue(transactions) {
  const revenue = transactions.reduce(
    (total, transaction) =>
      total + Number(
        transaction.fee_revenue ?? 0
      ),
    0
  );

  return {
    value: round(revenue),
    unit: "INR",
    completedTransactions: transactions.length,
  };
}

export async function getGoalProgress({
  businessId,
  goalId,
}) {
  if (!businessId || !goalId) {
    throw new Error(
      "businessId and goalId are required"
    );
  }

  // 1. Fetch goal only from the authorized business.
  const { data: goal, error: goalError } =
    await supabase
      .from("agent_goals")
      .select(`
        id,
        business_id,
        title,
        description,
        goal_type,
        target_metric,
        baseline_value,
        target_value,
        due_at,
        status
      `)
      .eq("id", goalId)
      .eq("business_id", businessId)
      .maybeSingle();

  if (goalError) throw goalError;

  if (!goal) {
    const error = new Error("Goal not found");
    error.statusCode = 404;
    throw error;
  }

  // 2. Validate supported success metric.
  if (!SUPPORTED_METRICS.includes(
    goal.target_metric
  )) {
    return {
      goalId,
      businessId,
      status: "unsupported_metric",
      metric: goal.target_metric,
      supportedMetrics: SUPPORTED_METRICS,
      message:
        "This goal metric does not have a measurement adapter yet",
    };
  }

  // 3. Determine measurement window.
  const window = getMeasurementWindow();

  // 4. Fetch completed business transactions.
  const transactions =
    await fetchCompletedTransactions({
      businessId,
      start: window.start,
      end: window.end,
    });

  // 5. Calculate actual metric.
  const measurement =
    goal.target_metric === "repeat_customer_rate"
      ? calculateRepeatCustomerRate(transactions)
      : calculateMonthlyFeeRevenue(transactions);

  const baseline = goal.baseline_value === null
    ? null
    : Number(goal.baseline_value);

  const target = goal.target_value === null
    ? null
    : Number(goal.target_value);

  const actual = measurement.value;

  // 6. Measure progress from baseline to target.
  let progressPercentage = null;

  if (
    actual !== null &&
    baseline !== null &&
    target !== null &&
    target > baseline
  ) {
    progressPercentage = round(
      Math.max(
        0,
        Math.min(
          100,
          ((actual - baseline) /
            (target - baseline)) * 100
        )
      )
    );
  }

  // 7. Determine whether the target is reached.
  const targetReached =
    actual !== null &&
    target !== null &&
    actual >= target;

  const remainingGap =
    actual === null || target === null
      ? null
      : round(Math.max(0, target - actual));

  const overdue =
    Boolean(goal.due_at) &&
    new Date(goal.due_at).getTime() <
      Date.now();

  return {
    goalId,
    businessId,

    title: goal.title,
    goalType: goal.goal_type,
    goalStatus: goal.status,

    metric: goal.target_metric,
    unit: measurement.unit,

    baseline,
    target,
    actual,

    progressPercentage,
    remainingGap,
    targetReached,
    overdue,

    dueAt: goal.due_at,

    measurementWindow: window,

    measurementDetails: measurement,

    // This is measurement, not proof
    // that an AI intervention caused growth.
    attribution:
      "Business metric observed; intervention impact not established",

    measuredAt: new Date().toISOString(),
  };
}
