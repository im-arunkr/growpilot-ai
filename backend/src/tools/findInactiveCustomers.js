
import { getCustomerRetention } from "../services/retention.service.js";
import { supabase } from "../config/supabase.js";

/**
 * GrowPilot AI — Retention Opportunity Tool
 *
 * Features:
 * - Identify at-risk customers
 * - Calculate priority scores
 * - Prevent duplicate open actions
 * - Prioritize eligible customers
 * - Return structured AI tool output
 *
 * Read-only tool.
 */

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const BLOCKING_STATUSES = [
  "pending_approval",
  "approved",
  "executing",
];

// Fetch all currently open retention message actions.
async function getCustomersWithOpenActions(businessId) {
  const customerIds = new Set();
  const pageSize = 500;

  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase
      .from("agent_actions")
      .select("id, customer_id")
      .eq("business_id", businessId)
      .eq("action_type", "send_message")
      .in("status", BLOCKING_STATUSES)
      .order("id", { ascending: true })
      .range(start, start + pageSize - 1);

    if (error) throw error;

    for (const action of data ?? []) {
      if (action.customer_id) {
        customerIds.add(action.customer_id);
      }
    }

    if ((data ?? []).length < pageSize) break;
  }

  return customerIds;
}

export const findInactiveCustomersTool = {
  name: "find_inactive_customers",

  description:
    "Identify and prioritize at-risk customers while excluding customers with existing open retention message actions.",

  parameters: {
    type: "object",
    properties: {
      businessId: {
        type: "string",
        description: "Unique business identifier",
      },
      limit: {
        type: "integer",
        description: "Maximum opportunities to return",
        minimum: 1,
        maximum: 100,
        default: 20,
      },
    },
    required: ["businessId"],
  },

  async execute({ businessId, limit = 20 }) {
    if (
      typeof businessId !== "string" ||
      !UUID_REGEX.test(businessId)
    ) {
      throw new Error("Invalid businessId");
    }

    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      throw new Error(
        "limit must be an integer between 1 and 100"
      );
    }

    // Fetch retention analysis and open actions
    const [analysis, blockedCustomerIds] =
      await Promise.all([
        getCustomerRetention(businessId),
        getCustomersWithOpenActions(businessId),
      ]);

    const allOpportunities = analysis.customers
      .filter(
        (customer) =>
          customer.status === "inactive" ||
          customer.status === "declining"
      )
      .map((customer) => {
        const inactivityScore = Math.min(
          customer.inactiveDays ?? 0,
          90
        );

        const engagementScore = Math.min(
          customer.totalTransactions * 3,
          30
        );

        const priorityScore = Math.min(
          inactivityScore + engagementScore,
          100
        );

        let priority = "low";

        if (priorityScore >= 60) {
          priority = "high";
        } else if (priorityScore >= 35) {
          priority = "medium";
        }

        return {
          customerId: customer.customerId,
          customerName: customer.customerName,
          status: customer.status,
          inactiveDays: customer.inactiveDays,
          lastTransactionDate: customer.lastTransactionDate,
          totalTransactions: customer.totalTransactions,
          historicalRevenue: customer.totalRevenue,
          priority,
          priorityScore,
          marketingConsent: customer.marketingConsent,
          recommendedAction:
            customer.status === "inactive"
              ? "Prepare a personalized re-engagement message"
              : "Prepare a friendly customer follow-up",
        };
      })
      .sort(
        (a, b) =>
          b.priorityScore - a.priorityScore ||
          b.inactiveDays - a.inactiveDays
      );

    // Exclude customers with open actions
    const eligibleOpportunities =
      allOpportunities.filter(
        (customer) =>
          !blockedCustomerIds.has(customer.customerId)
      );

    const selectedOpportunities =
      eligibleOpportunities.slice(0, limit);

    return {
      tool: this.name,
      businessId,

      summary: {
        totalCustomers: analysis.summary.totalCustomers,
        atRiskCustomers: analysis.summary.atRisk,
        totalOpportunities: allOpportunities.length,
        blockedOpenActionCustomers:
          allOpportunities.length -
          eligibleOpportunities.length,
        eligibleOpportunities:
          eligibleOpportunities.length,
        returnedOpportunities:
          selectedOpportunities.length,
      },

      opportunities: selectedOpportunities,

      generatedAt: new Date().toISOString(),
    };
  },
};
