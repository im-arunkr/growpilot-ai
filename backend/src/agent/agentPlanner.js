
import { z } from "zod";
import { routeAIRequest } from "./modelRouter.js";

/**
 * GrowPilot AI — Goal-Aware Agent Planner
 *
 * - Prioritizes customer retention opportunities
 * - Uses measurable business goal context
 * - Generates deterministic action plans
 * - Enhances the top action using Ollama
 * - Falls back safely if inference fails
 * - Never sends messages automatically
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

const PRIORITY_WEIGHT = {
  high: 30,
  medium: 15,
  low: 5,
};

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(Number(value) * factor) / factor;
}

function buildGoalContext(goalProgress) {
  if (!goalProgress || goalProgress.status === "unsupported_metric") {
    return {
      measurable: false,
      reason: "Goal progress metric unavailable",
    };
  }

  return {
    measurable: goalProgress.actual !== null &&
      goalProgress.target !== null,
    goalId: goalProgress.goalId,
    metric: goalProgress.metric,
    unit: goalProgress.unit,
    baseline: goalProgress.baseline,
    actual: goalProgress.actual,
    target: goalProgress.target,
    remainingGap: goalProgress.remainingGap,
    progressPercentage: goalProgress.progressPercentage,
    targetReached: goalProgress.targetReached,
    overdue: goalProgress.overdue,
    dueAt: goalProgress.dueAt,
    measurementWindow: goalProgress.measurementWindow,
  };
}

/**
 * Produce a transparent prioritization score.
 *
 * The score is a ranking heuristic,
 * not a trained churn probability.
 */
function calculateOpportunityScore(customer) {
  const originalScore = Number(customer.priorityScore ?? 0);
  const safeOriginalScore = Number.isFinite(originalScore)
    ? originalScore
    : 0;

  const priority = PRIORITY_WEIGHT[customer.priority] ?? 0;
  const inactiveDays = Math.max(
    0,
    Number(customer.inactiveDays) || 0
  );

  const transactions = Math.max(
    0,
    Number(customer.totalTransactions) || 0
  );

  const inactivityContribution =
    Math.min(inactiveDays, 90) * 0.1;

  const loyaltyContribution =
    Math.min(transactions, 20) * 0.5;

  return round(
    safeOriginalScore +
    priority +
    inactivityContribution +
    loyaltyContribution
  );
}

/**
 * Generate a structured, goal-aware retention plan.
 */
export function createAgentPlan({
  businessId,
  opportunities = [],
  maxActions = 10,
  goalProgress = null,
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

  const goalContext = buildGoalContext(goalProgress);

  // Do not propose unnecessary interventions if
  // the business goal has already been reached.
  const targetReached = goalContext.targetReached === true;

  const rankedOpportunities = opportunities
    .filter(
      (customer) =>
        customer.customerId &&
        ACTION_CONFIG[customer.status]
    )
    .map((customer) => ({
      ...customer,
      calculatedScore: calculateOpportunityScore(customer),
    }))
    .sort(
      (a, b) =>
        b.calculatedScore - a.calculatedScore ||
        String(a.customerId).localeCompare(
          String(b.customerId)
        )
    );

  const selectedOpportunities = targetReached
    ? []
    : rankedOpportunities.slice(0, maxActions);

  const actions = selectedOpportunities.map((customer) => {
    const config = ACTION_CONFIG[customer.status];

    const metricExplanation =
      goalContext.measurable
        ? `Current ${goalContext.metric}: ` +
          `${goalContext.actual} ${goalContext.unit}. ` +
          `Target: ${goalContext.target} ${goalContext.unit}.`
        : "Business goal measurement is unavailable.";

    return {
      customerId: customer.customerId,
      customerName: customer.customerName,

      actionType: config.actionType,
      title: config.title,

      priority: customer.priority,
      priorityScore: customer.calculatedScore,

      rationale:
        `${customer.customerName} has not completed a ` +
        `transaction for ${customer.inactiveDays} days. ` +
        `Historical transactions: ${customer.totalTransactions}. ` +
        metricExplanation,

      objective: config.objective,
      recommendedAction: customer.recommendedAction,

      expectedOutcome:
        "Potential repeat transaction opportunity. " +
        "Actual retention or revenue impact must be measured " +
        "after the intervention.",

      goalMetric: goalContext.metric ?? null,

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
    goalTargetReached: targetReached,
    remainingGoalGap: goalContext.remainingGap ?? null,
  };

  return {
    businessId,
    goalId: goalContext.goalId ?? null,
    goalContext,

    planType: "customer_retention",
    title: "Goal-Driven Customer Retention Plan",

    objective: targetReached
      ? "Business goal has already reached its target. " +
        "No new retention actions are required."
      : "Prioritize customer retention opportunities " +
        "to support the measurable business goal.",

    summary,
    actions,

    requiresHumanApproval: actions.length > 0,
    executionMode: "simulation",
    status: targetReached ? "goal_reached" : "proposed",

    prioritizationMethod:
      "Deterministic priority, inactivity and historical transaction ranking",

    impactMeasurement:
      "Actual improvement requires future transaction evidence; " +
      "simulated messages are not treated as customer responses.",

    generatedAt: new Date().toISOString(),
  };
}

// ======================================================
// AI STRATEGY ENRICHMENT
// ======================================================

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

function createSafeStrategy(customer, goalContext) {
  const goalExplanation = goalContext?.measurable
    ? `The business is working toward ${goalContext.target} ` +
      `${goalContext.unit} for ${goalContext.metric}.`
    : "The business is working to improve customer retention.";

  return {
    reason:
      `${customer.customerName} has not completed a ` +
      `transaction for ${customer.inactiveDays} days.`,

    strategy:
      "Prepare a personalized re-engagement message " +
      "for owner review using simulation only. " +
      goalExplanation,

    expectedOutcome:
      "A possible repeat transaction opportunity. " +
      "Actual business impact has not been measured.",

    priority: customer.priority,
    requiresApproval: true,
  };
}

export async function enrichActionPlanWithAI({
  actionPlan,
  opportunities,
  businessName,
  goalProgress = null,
}) {
  if (!actionPlan || !Array.isArray(actionPlan.actions)) {
    throw new Error("Valid action plan is required");
  }

  if (!Array.isArray(opportunities)) {
    throw new Error("Opportunities must be an array");
  }

  const topAction = actionPlan.actions[0];

  if (!topAction) {
    return {
      ...actionPlan,
      aiMetadata: {
        used: false,
        provider: null,
        model: null,
        latencyMs: null,
        strategySource: "not_required",
        guardrailTriggered: false,
        fallbackReason: "No actions available",
        aiEnhancedActions: 0,
      },
    };
  }

  const customer = opportunities.find(
    (item) => item.customerId === topAction.customerId
  );

  if (!customer) {
    throw new Error("Opportunity data not found");
  }

  const goalContext = buildGoalContext(goalProgress);

  let strategy = createSafeStrategy(customer, goalContext);
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

        goal: goalContext,

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
