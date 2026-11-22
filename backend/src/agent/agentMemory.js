
import { supabase } from "../config/supabase.js";

/**
 * GrowPilot AI — Persistent Agent State
 *
 * Stores:
 * - Agent runs
 * - Execution checkpoints
 * - Action plans
 * - Pending approval actions
 * - Execution history
 *
 * Uses existing Supabase schema.
 */

export async function saveAgentExecution({
  runId,
  businessId,
  goal,
  actionPlan,
  steps = [],
  summary = {},
}) {
  if (!runId || !businessId || !actionPlan) {
    throw new Error("Missing required execution data");
  }

  if (!Array.isArray(actionPlan.actions)) {
    throw new Error("Invalid action plan");
  }

  // Resolve existing active business goal
  const { data: goalRecord, error: goalError } =
    await supabase
      .from("agent_goals")
      .select("id")
      .eq("business_id", businessId)
      .eq("goal_type", goal)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (goalError) throw goalError;

  if (!goalRecord) {
    throw new Error("No active agent goal found");
  }

  // Prevent accidentally persisting the same run twice
  const { data: existingRun, error: lookupError } =
    await supabase
      .from("agent_runs")
      .select("id")
      .eq("id", runId)
      .maybeSingle();

  if (lookupError) throw lookupError;

  if (existingRun) {
    throw new Error("Agent run already exists");
  }

  let runCreated = false;

  try {
    // 1. Create persistent agent run
    const { error: runError } = await supabase
      .from("agent_runs")
      .insert({
        id: runId,
        business_id: businessId,
        goal_id: goalRecord.id,
        status: "waiting_approval",
        current_step: "awaiting_human_approval",
        attempt_count: 1,
        checkpoint: {
          goal,
          steps,
          summary,
          pendingApproval: actionPlan.summary.pendingApproval,
        },
        summary: `Generated ${actionPlan.actions.length} retention actions`,
        started_at: steps[0]?.timestamp ??
          new Date().toISOString(),
      });

    if (runError) throw runError;

    runCreated = true;

    // 2. Save action plan
    const { data: savedPlan, error: planError } =
      await supabase
        .from("action_plans")
        .insert({
          business_id: businessId,
          run_id: runId,
          title: actionPlan.title,
          rationale: actionPlan.objective,
          plan_json: actionPlan,
          status: "proposed",
        })
        .select("id")
        .single();

    if (planError) throw planError;

    // 3. Save pending approval actions
    const actionRows = actionPlan.actions.map(
      (action) => ({
        business_id: businessId,
        run_id: runId,
        plan_id: savedPlan.id,
        customer_id: action.customerId,
        action_type: action.actionType,
        channel: "simulation",


        payload: {
          // Customer information
          title: action.title,
          customerName: action.customerName,
          priority: action.priority,
          priorityScore: action.priorityScore,

          // Retention recommendation
          recommendedAction: action.recommendedAction,
          marketingConsent: action.marketingConsent,

          // AI-assisted strategy
          aiStrategy: action.aiStrategy ?? null,
          strategySource:
            action.strategySource ?? "deterministic",

          // Safety configuration
          executionMode: "simulation",
          requiresApproval: true,
          executionAllowed: false,

          // AI metadata
          aiModel: action.aiStrategy
            ? actionPlan.aiMetadata?.model ?? null
            : null,

          guardrailTriggered: action.aiStrategy
            ? actionPlan.aiMetadata?.guardrailTriggered ?? false
            : false,
        },


        rationale: action.rationale,
        expected_outcome: action.expectedOutcome,

        idempotency_key:
          `${runId}:${action.customerId}:${action.actionType}`,

        status: "pending_approval",
        requires_approval: true,
      })
    );

    let savedActions = [];

    if (actionRows.length > 0) {
      const { data, error: actionsError } =
        await supabase
          .from("agent_actions")
          .insert(actionRows)
          .select("id, customer_id, status");


      if (actionsError) {
        // PostgreSQL unique constraint violation
        if (actionsError.code === "23505") {
          const duplicateError = new Error(
            "One or more customers already have an open retention action. Please refresh the opportunities and try again."
          );

          duplicateError.code = "DUPLICATE_OPEN_ACTION";
          duplicateError.statusCode = 409;

          throw duplicateError;
        }

        throw actionsError;
      }


      savedActions = data;
    }

    // 4. Save execution history
    const logRows = steps.map((step) => ({
      business_id: businessId,
      run_id: runId,
      event_type: step.step,
      severity: step.status === "failed"
        ? "error"
        : "info",
      tool_name: step.tool ?? null,
      latency_ms: step.durationMs ?? null,
      details: step,
    }));

    if (logRows.length > 0) {
      const { error: logError } = await supabase
        .from("execution_logs")
        .insert(logRows);

      if (logError) throw logError;
    }

    return {
      persisted: true,
      runId,
      planId: savedPlan.id,
      goalId: goalRecord.id,
      savedActions: savedActions.length,
      savedLogs: logRows.length,
      status: "waiting_approval",
    };

  } catch (error) {
    // Best-effort rollback for partial writes.
    // Related records are removed through FK cascades.
    if (runCreated) {
      const { error: cleanupError } = await supabase
        .from("agent_runs")
        .delete()
        .eq("id", runId)
        .eq("business_id", businessId);

      if (cleanupError) {
        console.error(
          "Agent persistence cleanup failed:",
          cleanupError.message
        );
      }
    }

    console.error(
      "Failed to persist agent execution:",
      error.message
    );

    throw error;
  }
}

/**
 * GrowPilot AI — Agent Execution History
 *
 * Fetches saved agent execution logs.
 *
 * Features:
 * - Business-specific history
 * - Optional run filtering
 * - Pagination
 * - Latest events first
 */

export async function getAgentExecutionHistory({
  businessId,
  runId = null,
  page = 1,
  limit = 20,
}) {
  if (!businessId) {
    throw new Error("businessId is required");
  }

  if (!Number.isInteger(page) || page < 1) {
    throw new Error("Invalid page number");
  }

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    throw new Error("Limit must be between 1 and 100");
  }

  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("execution_logs")
    .select(
      `
      id,
      business_id,
      run_id,
      action_id,
      event_type,
      severity,
      tool_name,
      model_name,
      latency_ms,
      details,
      created_at
      `,
      { count: "exact" }
    )
    .eq("business_id", businessId);

  // Filter history for a specific agent run
  if (runId) {
    query = query.eq("run_id", runId);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    console.error(
      "Failed to fetch execution history:",
      error.message
    );
    throw error;
  }

  return {
    logs: data ?? [],

    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },

    filters: {
      businessId,
      runId,
    },

    generatedAt: new Date().toISOString(),
  };
}
