
import { supabase } from "../config/supabase.js";

/**
 * Extract year and month in India timezone.
 */
const monthFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  year: "numeric",
  month: "2-digit",
});

function getISTMonthKey(timestamp) {
  if (!timestamp) return null;

  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) return null;

  const parts = monthFormatter.formatToParts(date);

  const year = parts.find(
    (part) => part.type === "year"
  )?.value;

  const month = parts.find(
    (part) => part.type === "month"
  )?.value;

  if (!year || !month) return null;

  return `${year}-${month}`;
}

function roundCurrency(value) {
  return Number(value.toFixed(2));
}

/**
 * Get business analytics.
 *
 * All revenue calculations include completed
 * transactions only.
 *
 * Monthly reporting uses Asia/Kolkata timezone.
 */
export async function getBusinessAnalytics(businessId) {
  // Verify business exists
  const { data: business, error: businessError } =
    await supabase
      .from("businesses")
      .select("id, name, owner_name")
      .eq("id", businessId)
      .maybeSingle();

  if (businessError) throw businessError;

  if (!business) {
    throw new Error("Business not found");
  }

  // Fetch customers
  const { data: customerRows, error: customerError } =
    await supabase
      .from("customers")
      .select("id")
      .eq("business_id", businessId);

  if (customerError) throw customerError;

  // Fetch transactions
  const { data: transactionRows, error: transactionError } =
    await supabase
      .from("transactions")
      .select(
        "customer_id, amount, fee_revenue, status, occurred_at"
      )
      .eq("business_id", businessId);

  if (transactionError) throw transactionError;

  const customers = customerRows ?? [];
  const transactions = transactionRows ?? [];

  const completedTransactions = transactions.filter(
    (transaction) => transaction.status === "completed"
  );

  // Total completed transaction revenue
  const totalRevenue = completedTransactions.reduce(
    (sum, transaction) =>
      sum + Number(transaction.fee_revenue || 0),
    0
  );

  // Total money processed in completed transactions
  const totalTransactionValue =
    completedTransactions.reduce(
      (sum, transaction) =>
        sum + Number(transaction.amount || 0),
      0
    );

  // Customers with at least one completed transaction
  const uniqueActiveCustomers = new Set(
    completedTransactions
      .map((transaction) => transaction.customer_id)
      .filter(Boolean)
  ).size;

  /**
   * Monthly transaction analytics.
   *
   * Revenue and transaction value are calculated
   * from completed transactions only.
   *
   * Transaction counts include both total
   * and completed transactions.
   */
  const monthlyMap = new Map();

  for (const transaction of transactions) {
    const month = getISTMonthKey(
      transaction.occurred_at
    );

    if (!month) continue;

    if (!monthlyMap.has(month)) {
      monthlyMap.set(month, {
        month,
        totalTransactions: 0,
        completedTransactions: 0,
        totalRevenue: 0,
        totalTransactionValue: 0,
      });
    }

    const monthly = monthlyMap.get(month);

    monthly.totalTransactions += 1;

    if (transaction.status === "completed") {
      monthly.completedTransactions += 1;

      monthly.totalRevenue += Number(
        transaction.fee_revenue || 0
      );

      monthly.totalTransactionValue += Number(
        transaction.amount || 0
      );
    }
  }

  const monthlyTrends = Array.from(
    monthlyMap.values()
  )
    .sort((a, b) =>
      a.month.localeCompare(b.month)
    )
    .map((month) => ({
      month: month.month,
      totalTransactions: month.totalTransactions,
      completedTransactions:
        month.completedTransactions,
      totalRevenue: roundCurrency(
        month.totalRevenue
      ),
      totalTransactionValue: roundCurrency(
        month.totalTransactionValue
      ),
      completionRate:
        month.totalTransactions > 0
          ? Number(
              (
                (month.completedTransactions /
                  month.totalTransactions) *
                100
              ).toFixed(2)
            )
          : 0,
    }));

  return {
    business,

    // Existing summary structure preserved
    summary: {
      totalCustomers: customers.length,
      totalTransactions: transactions.length,
      completedTransactions:
        completedTransactions.length,
      totalRevenue: roundCurrency(totalRevenue),
      totalTransactionValue: roundCurrency(
        totalTransactionValue
      ),
      customersWithCompletedTransactions:
        uniqueActiveCustomers,
    },

    // New monthly analytics
    monthlyTrends,

    generatedAt: new Date().toISOString(),
  };
}
