
import { z } from "zod";
import { routeAIRequest } from "./modelRouter.js";
/**
 * GrowPilot AI — Agent Planner
 *
 * Responsibilities:
 * - Convert retention opportunities into action plans
 * - Prioritize customer actions
 * - Define expected outcomes
 * - Enforce human approval requirements
 *
 * Current version: Deterministic planning
 * AI model reasoning will be integrated later.
 */

const ACTION_CONFIG = {
  inactive: {
    actionType: "send_message",
    title: "Customer Re-engagement",
    objective: "Encourage inactive customers to return",
  },

  declining: {
    actionType: "send_message",
    title: "Customer Retention Follow-up",
    objective: "Prevent customers from becoming inactive",
  },
};

/**
 * Generate a structured retention plan.
 */
export function createAgentPlan({
  businessId,
  opportunities = [],
  maxActions = 10,
}) {
  if (!businessId || typeof businessId !== "string") {
    throw new Error("Valid businessId is required");
  }

  if (!Array.isArray(opportunities)) {
    throw new Error("Opportunities must be an array");
  }

  if (
    !Number.isInteger(maxActions) ||
    maxActions < 1 ||
    maxActions > 100
  ) {
    throw new Error("maxActions must be between 1 and 100");
  }

  const validOpportunities = opportunities
    .filter(
      (customer) =>
        customer.customerId &&
        ACTION_CONFIG[customer.status]
    )
    .sort(
      (a, b) =>
        (b.priorityScore ?? 0) -
        (a.priorityScore ?? 0)
    )
    .slice(0, maxActions);

  const actions = validOpportunities.map((customer) => {
    const config = ACTION_CONFIG[customer.status];

    return {
      customerId: customer.customerId,
      customerName: customer.customerName,

      actionType: config.actionType,
      title: config.title,

      priority: customer.priority,
      priorityScore: customer.priorityScore,

      rationale:
        `${customer.customerName} has not completed a ` +
        `transaction for ${customer.inactiveDays} days. ` +
        `Historical transactions: ${customer.totalTransactions}.`,

      objective: config.objective,

      recommendedAction: customer.recommendedAction,

      expectedOutcome:
        "Encourage the customer to make a repeat transaction",

      channel: "simulation",

      requiresApproval: true,
      status: "proposed",

      marketingConsent: customer.marketingConsent,

      executionAllowed: false,
    };
  });

  const summary = {
    totalActions: actions.length,

    highPriority: actions.filter(
      (action) => action.priority === "high"
    ).length,

    mediumPriority: actions.filter(
      (action) => action.priority === "medium"
    ).length,

    lowPriority: actions.filter(
      (action) => action.priority === "low"
    ).length,

    pendingApproval: actions.length,
  };

  return {
    businessId,
    planType: "customer_retention",

    title: "Customer Retention Growth Plan",

    objective:
      "Improve customer retention and identify opportunities " +
      "to increase repeat transactions.",

    summary,
    actions,

    requiresHumanApproval: true,
    executionMode: "simulation",

    status: "proposed",
    generatedAt: new Date().toISOString(),
  };
}

/**
 * GrowPilot AI — AI-Assisted Action Planning
 *
 * Enriches the highest-priority action with an
 * AI-generated retention strategy.
 *
 * Safety:
 * - Keeps deterministic customer prioritization
 * - Validates AI output
 * - Blocks unsupported recommendations
 * - Uses a safe fallback on AI failure
 * - Never executes customer messages
 */

const aiStrategySchema = z.object({
  reason: z.string().trim().min(10),
  strategy: z.string().trim().min(10),
  expectedOutcome: z.string().trim().min(10),
  priority: z.enum(["high", "medium", "low"]),
  requiresApproval: z.boolean(),
});

const unsafePatterns = [
  /\bemail\b/i,
  /\bwhatsapp\b/i,
  /\bsms\b/i,
  /\bdiscount\b/i,
  /\bspecial offer\b/i,
  /\bfree consultation\b/i,
  /\bguaranteed?\b/i,
  /\bwill definitely\b/i,
  /\bloss of interest\b/i,
  /\bcontact issues?\b/i,
];

function createSafeStrategy(customer) {
  return {
    reason:
      `${customer.customerName} has not completed a ` +
      `transaction for ${customer.inactiveDays} days.`,

    strategy:
      "Prepare a personalized re-engagement message " +
      "for owner review using simulation only.",

    expectedOutcome:
      "A possible customer re-engagement opportunity. " +
      "Actual business impact has not been measured.",

    priority: customer.priority,
    requiresApproval: true,
  };
}

export async function enrichActionPlanWithAI({
  actionPlan,
  opportunities,
  businessName,
}) {
  if (!actionPlan || !Array.isArray(actionPlan.actions)) {
    throw new Error("Valid action plan is required");
  }

  if (!Array.isArray(opportunities)) {
    throw new Error("Opportunities must be an array");
  }

  // Only one AI call to keep local inference fast.
  const topAction = actionPlan.actions[0];

  if (!topAction) {
    return {
      ...actionPlan,
      aiMetadata: {
        used: false,
        reason: "No actions available",
      },
    };
  }

  const customer = opportunities.find(
    (item) => item.customerId === topAction.customerId
  );

  if (!customer) {
    throw new Error("Opportunity data not found");
  }

  let strategy = createSafeStrategy(customer);
  let source = "deterministic_fallback";
  let model = null;
  let latencyMs = null;
  let guardrailTriggered = false;
  let fallbackReason = null;

  try {
    const aiResult = await routeAIRequest({
      task: "retention_strategy",
      data: {
        businessName,
        customer: {
          customerName: customer.customerName,
          status: customer.status,
          inactiveDays: customer.inactiveDays,
          totalTransactions: customer.totalTransactions,
          priority: customer.priority,
        },
      },
    });

    model = aiResult.model;
    latencyMs = aiResult.latencyMs;

    const parsed = aiStrategySchema.safeParse(
      aiResult.output
    );

    if (!parsed.success) {
      throw new Error("Invalid AI strategy structure");
    }

    const text = [
      parsed.data.reason,
      parsed.data.strategy,
      parsed.data.expectedOutcome,
    ].join(" ");

    guardrailTriggered = unsafePatterns.some(
      (pattern) => pattern.test(text)
    );

    if (!guardrailTriggered) {
      strategy = {
        ...parsed.data,
        priority: customer.priority,
        requiresApproval: true,
      };

      source = "ollama";
    } else {
      fallbackReason = "AI safety guardrail triggered";
    }

  } catch (error) {
    fallbackReason = error.message;

    console.error(
      "AI planning fallback activated:",
      error.message
    );
  }

  // Enrich the first action without modifying the original.
  const enrichedActions = actionPlan.actions.map(
    (action, index) => {
      if (index !== 0) return action;

      return {
        ...action,
        aiStrategy: strategy,
        strategySource: source,
        requiresApproval: true,
        executionAllowed: false,
      };
    }
  );

  return {
    ...actionPlan,
    actions: enrichedActions,

    aiMetadata: {
      used: true,
      provider: model ? "ollama" : null,
      model,
      latencyMs,
      strategySource: source,
      guardrailTriggered,
      fallbackReason,
      aiEnhancedActions: source === "ollama" ? 1 : 0,
    },
  };
}
