
import { supabase } from "../config/supabase.js";

/**
 * GrowPilot AI — Agent Evaluation Service
 *
 * Evaluates:
 * - Proposed actions
 * - Approval / rejection results
 * - Execution completion
 * - Failed and pending actions
 * - Simulated delivery outcomes
 *
 * This is an operational evaluation, not a claim
 * that customer retention or revenue increased.
 */

export async function evaluateAgentRun(runId, businessId) {
  // 1. Fetch agent run
  const { data: run, error: runError } = await supabase
    .from("agent_runs")
    .select("id, business_id, goal_id, status, started_at")
    .eq("id", runId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (runError) throw runError;

  if (!run) {
    throw new Error("Agent run not found");
  }

  // 2. Fetch all actions for this run
  const { data: actions, error: actionsError } = await supabase
    .from("agent_actions")
    .select("id, status, requires_approval, approved_at")
    .eq("run_id", runId)
    .eq("business_id", businessId);

  if (actionsError) throw actionsError;

  const totalActions = actions.length;

  const countByStatus = (status) =>
    actions.filter((action) => action.status === status).length;

  const completed = countByStatus("completed");
  const rejected = countByStatus("rejected");
  const failed = countByStatus("failed");
  const pendingApproval = countByStatus("pending_approval");
  const approved = countByStatus("approved");
  const executing = countByStatus("executing");

  const resolved = completed + rejected + failed;


  // 3. Fetch deliveries linked to this run's actions
  const actionIds = actions.map((action) => action.id);

  let deliveries = [];

  if (actionIds.length > 0) {
    const { data, error: deliveryError } = await supabase
      .from("message_deliveries")
      .select("id, action_id, status")
      .eq("business_id", businessId)
      .in("action_id", actionIds);

    if (deliveryError) throw deliveryError;

    deliveries = data ?? [];
  }

  const simulatedMessages = deliveries.filter(
    (delivery) => delivery.status === "sent"
  ).length;


  // 4. Calculate operational metrics
  const completionRate = totalActions
    ? Number(((completed / totalActions) * 100).toFixed(2))
    : 0;

  const resolutionRate = totalActions
    ? Number(((resolved / totalActions) * 100).toFixed(2))
    : 0;

  const failedRate = totalActions
    ? Number(((failed / totalActions) * 100).toFixed(2))
    : 0;

  const finished =
    totalActions > 0 && resolved === totalActions;

  const metrics = {
    totalActions,
    completed,
    rejected,
    failed,
    pendingApproval,
    approved,
    executing,
    simulatedMessages,
    completionRate,
    resolutionRate,
    failedRate,
  };

  // 5. Generate evaluation findings
  const findings = [];

  if (pendingApproval > 0) {
    findings.push(
      `${pendingApproval} actions are waiting for owner approval.`
    );
  }

  if (approved > 0) {
    findings.push(
      `${approved} approved actions are awaiting execution.`
    );
  }

  if (executing > 0) {
    findings.push(
      `${executing} actions are currently executing.`
    );
  }

  if (failed > 0) {
    findings.push(
      `${failed} actions failed and require review.`
    );
  }

  if (completed > 0) {
    findings.push(
      `${completed} actions completed successfully.`
    );
  }

  if (rejected > 0) {
    findings.push(
      `${rejected} actions were rejected by the owner.`
    );
  }

  if (totalActions === 0) {
    findings.push("No actions were generated for this run.");
  }

  // 6. Suggest next operational action
  let recommendation = "No further action required.";

  if (failed > 0) {
    recommendation =
      "Review failed actions before deciding whether to retry.";
  } else if (pendingApproval > 0) {
    recommendation =
      "Review and approve or reject pending actions.";
  } else if (approved > 0) {
    recommendation =
      "Execute approved actions through the simulation workflow.";
  } else if (executing > 0) {
    recommendation =
      "Monitor executing actions and recover stale executions.";
  } else if (finished) {
    recommendation =
      "Operational workflow finished. Review subsequent customer transactions to measure retention impact.";
  }

  return {
    runId,
    businessId,
    evaluationType: "operational",
    status: finished ? "completed" : "in_progress",
    metrics,
    findings,
    recommendation,
    outcomeMeasured: false,
    evaluatedAt: new Date().toISOString(),
  };
}

/**
 * GrowPilot AI — Persist Agent Evaluation
 *
 * Saves operational evaluation results to Supabase.
 *
 * Uses the existing evaluation_results table.
 * No database schema modification required.
 *
 * Note:
 * - execution_quality is the supported DB type.
 * - In-progress evaluations use status "pending".
 * - Repeated evaluations update the existing result.
 */

export async function saveAgentEvaluation(runId, businessId) {
  // 1. Calculate latest evaluation
  const evaluation = await evaluateAgentRun(
    runId,
    businessId
  );

  // 2. Map application status to database status
  const databaseStatus =
    evaluation.status === "completed"
      ? "completed"
      : "pending";

  // 3. Prepare structured evaluation data
  const evaluationData = {
    business_id: businessId,
    run_id: runId,
    evaluation_type: "execution_quality",
    status: databaseStatus,

    metric_name: "action_resolution_rate",
    baseline_value: 0,
    actual_value: evaluation.metrics.resolutionRate,

    findings: evaluation.findings.join("\n"),

    recommendations: [
      {
        type: "operational_metrics",
        data: evaluation.metrics,
      },
      {
        type: "next_action",
        message: evaluation.recommendation,
      },
      {
        type: "evaluation_context",
        outcomeMeasured: evaluation.outcomeMeasured,
        evaluatedAt: evaluation.evaluatedAt,
      },
    ],

    evaluated_at: evaluation.evaluatedAt,
  };

  // 4. Check whether an evaluation already exists
  const { data: existingRecords, error: lookupError } =
    await supabase
      .from("evaluation_results")
      .select("id")
      .eq("run_id", runId)
      .eq("business_id", businessId)
      .eq("evaluation_type", "execution_quality")
      .order("created_at", { ascending: false })
      .limit(1);

  if (lookupError) throw lookupError;

  const existingId = existingRecords?.[0]?.id;

  let savedEvaluation;

  // 5. Update existing evaluation or insert new one
  if (existingId) {
    const { data, error } = await supabase
      .from("evaluation_results")
      .update(evaluationData)
      .eq("id", existingId)
      .eq("business_id", businessId)
      .select()
      .single();

    if (error) throw error;

    savedEvaluation = data;
  } else {
    const { data, error } = await supabase
      .from("evaluation_results")
      .insert(evaluationData)
      .select()
      .single();

    if (error) throw error;

    savedEvaluation = data;
  }

  // 6. Return evaluation result
  return {
    success: true,
    persisted: true,
    evaluationId: savedEvaluation.id,
    runId,
    businessId,
    databaseStatus: savedEvaluation.status,
    operation: existingId ? "updated" : "created",
    metrics: evaluation.metrics,
    findings: evaluation.findings,
    recommendation: evaluation.recommendation,
    evaluatedAt: evaluation.evaluatedAt,
  };
}
