
import { randomUUID } from "node:crypto";
import { getGoalProgress } from "../services/goalProgress.service.js";
import {
  executeTool,
  getAvailableTools,
} from "./toolRegistry.js";
import { supabase } from "../config/supabase.js";
import {
  createAgentPlan,
  enrichActionPlanWithAI,
} from "./agentPlanner.js";

import { saveAgentExecution } from "./agentMemory.js";
import { getBusinessById } from "../services/business.service.js";

/**
 * GrowPilot AI — AI-Enhanced Agent Runner
 *
 * Workflow:
 * 1. Receive business goal
 * 2. Select registered tool
 * 3. Analyze customer retention
 * 4. Generate deterministic action plan
 * 5. Enhance highest-priority action with Ollama AI
 * 6. Validate strategy and apply safety fallback
 * 7. Persist agent run, plan, actions and logs
 * 8. Wait for human approval
 *
 * No customer message is sent automatically.
 */

const SUPPORTED_GOALS = {
  customer_retention: {
    tool: "find_inactive_customers",
    description: "Identify customers needing retention attention",
  },
};

export async function runAgent({
  businessId,
  goalId = null,
  goal = "customer_retention",
  limit = 20,
}) {
  const runId = randomUUID();
  const startedAt = Date.now();
  const steps = [];

  const addStep = (step, status, details = {}) => {
    steps.push({
      step,
      status,
      timestamp: new Date().toISOString(),
      ...details,
    });
  };

  addStep("goal_received", "completed", {
    goal,
    businessId,
  });

  try {
    // 1. Validate supported goal
    const goalConfig = SUPPORTED_GOALS[goal];

    if (!goalConfig) {
      throw new Error(`Unsupported agent goal: ${goal}`);
    }

    // 2. Fetch business details
    const business = await getBusinessById(businessId);

    if (!business) {
      throw new Error("Business not found");
    }


    // Resolve exact goal when goalId is provided.
    let goalQuery = supabase
      .from("agent_goals")
      .select(
        "id, title, goal_type, target_metric, baseline_value, target_value, due_at"
      )
      .eq("business_id", businessId)
      .eq("goal_type", goal)
      .eq("status", "active");

    if (goalId) {
      goalQuery = goalQuery.eq("id", goalId);
    }

    const { data: activeGoal, error: goalError } =
      await goalQuery
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (goalError) throw goalError;

    if (!activeGoal) {
      throw new Error(
        "No matching active business goal found"
      );
    }

    // Measure goal progress before planning.
    const goalProgress = await getGoalProgress({
      businessId,
      goalId: activeGoal.id,
    });

    addStep("goal_progress_measured", "completed", {
      goalId: activeGoal.id,
      metric: goalProgress.metric,
      baseline: goalProgress.baseline,
      target: goalProgress.target,
      actual: goalProgress.actual,
      progressPercentage:
        goalProgress.progressPercentage,
      targetReached: goalProgress.targetReached,
    });

    // 3. Select registered tool
    addStep("tool_selected", "completed", {
      tool: goalConfig.tool,
      reason: goalConfig.description,
    });

    // 4. Execute customer retention tool
    const toolResult = await executeTool(goalConfig.tool, {
      businessId,
      limit,
    });

    addStep("tool_executed", "completed", {
      tool: goalConfig.tool,
      durationMs: toolResult.durationMs,
    });

    const opportunities =
      toolResult.result.opportunities ?? [];

    addStep("opportunities_identified", "completed", {
      count: opportunities.length,
    });

    // 5. Generate deterministic action plan
    const basePlan = createAgentPlan({
      businessId,
      opportunities,
      maxActions: limit,
      goalProgress,
    });

    addStep("action_plan_created", "completed", {
      totalActions: basePlan.summary.totalActions,
      highPriority: basePlan.summary.highPriority,
    });

    // 6. Enhance plan using Ollama
    addStep("ai_reasoning_started", "completed", {
      task: "retention_strategy",
      provider: "ollama",
    });

    const actionPlan = await enrichActionPlanWithAI({
      actionPlan: basePlan,
      opportunities,
      businessName: business.name,
      goalProgress,
    });

    const aiMetadata = actionPlan.aiMetadata;

    addStep("ai_reasoning_completed", "completed", {
      model: aiMetadata.model,
      strategySource: aiMetadata.strategySource,
      latencyMs: aiMetadata.latencyMs,
      guardrailTriggered: aiMetadata.guardrailTriggered,
      fallbackReason: aiMetadata.fallbackReason,
      aiEnhancedActions: aiMetadata.aiEnhancedActions,
    });

    // 7. Human approval is mandatory
    addStep("awaiting_human_approval", "pending", {
      actionsRequiringApproval:
        actionPlan.summary.pendingApproval,
    });

    // 8. Save execution in Supabase
    const persistence = await saveAgentExecution({
      runId,
      businessId,
      goalId: activeGoal.id,
      goal,
      goalProgress,
      actionPlan,
      steps,
      summary: toolResult.result.summary,
    });
    // 9. Return execution results
    return {
      success: true,
      runId,
      goal,
      businessId,
      goalProgress,
      status: "awaiting_approval",

      persisted: persistence.persisted,

      persistence: {
        planId: persistence.planId,
        goalId: persistence.goalId,
        savedActions: persistence.savedActions,
        savedLogs: persistence.savedLogs,
        databaseStatus: persistence.status,
      },

      ai: {
        enabled: true,
        provider: aiMetadata.provider,
        model: aiMetadata.model,
        strategySource: aiMetadata.strategySource,
        latencyMs: aiMetadata.latencyMs,
        guardrailTriggered: aiMetadata.guardrailTriggered,
        fallbackReason: aiMetadata.fallbackReason,
        aiEnhancedActions: aiMetadata.aiEnhancedActions,
      },

      availableTools: getAvailableTools().map(
        (tool) => tool.name
      ),

      summary: toolResult.result.summary,
      opportunities,
      actionPlan,
      steps,

      durationMs: Date.now() - startedAt,
      generatedAt: new Date().toISOString(),
    };

  } catch (error) {
    addStep("run_failed", "failed", {
      error: error.message,
    });

    console.error("Agent run failed:", {
      runId,
      message: error.message,
    });


    return {
      success: false,
      runId,
      goal,
      businessId,
      status: "failed",
      persisted: false,

      errorCode:
        error.code === "DUPLICATE_OPEN_ACTION"
          ? "DUPLICATE_OPEN_ACTION"
          : "AGENT_EXECUTION_FAILED",

      message:
        error.code === "DUPLICATE_OPEN_ACTION"
          ? error.message
          : "Agent execution or persistence failed",

      steps,
      durationMs: Date.now() - startedAt,
      completedAt: new Date().toISOString(),
    };

  }
}
