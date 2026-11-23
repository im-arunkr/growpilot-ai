
import { supabase } from "../config/supabase.js";

import { getGoalProgress } from "./goalProgress.service.js";

/**
 * GrowPilot AI — Goal Evaluation Engine
 *
 * Responsibilities:
 * - Evaluate measurable business goals
 * - Compare baseline, actual and target
 * - Save evaluation evidence
 * - Identify remaining goal gap
 * - Recommend the next worker step
 *
 * IMPORTANT:
 * Simulation execution is NOT proof of
 * increased customer retention or revenue.
 */

const METRIC_TYPES = {
  repeat_customer_rate: "retention",
  monthly_fee_revenue: "revenue",
};

function getNextRecommendation(progress) {
  if (progress.targetReached) {
    return {
      decision: "goal_target_reached",
      nextStep: "review_goal_completion",
      reason:
        "The measured business metric has reached its target.",
    };
  }

  if (progress.actual === null) {
    return {
      decision: "insufficient_data",
      nextStep: "collect_more_data",
      reason:
        "Not enough completed transaction data is available.",
    };
  }

  return {
    decision: "continue_improvement",
    nextStep: "review_and_replan",
    reason:
      "The business metric remains below target. " +
      "Review new customer activity before planning more interventions.",
  };
}

/**
 * Evaluate a persisted worker run.
 *
 * Caller must verify authentication,
 * business membership and run ownership.
 */
export async function evaluateAgentGoal({
  businessId,
  runId,
}) {
  if (!businessId || !runId) {
    throw new Error(
      "businessId and runId are required"
    );
  }

  // ==================================================
  // 1. LOAD THE AUTHORIZED WORKER RUN
  // ==================================================

  const { data: run, error: runError } =
    await supabase
      .from("agent_runs")
      .select(
        "id, business_id, goal_id, status, checkpoint"
      )
      .eq("id", runId)
      .eq("business_id", businessId)
      .maybeSingle();

  if (runError) throw runError;

  if (!run) {
    const error = new Error("Agent run not found");
    error.statusCode = 404;
    throw error;
  }

  // ==================================================
  // 2. MEASURE GOAL PROGRESS
  // ==================================================

  const progress = await getGoalProgress({
    businessId,
    goalId: run.goal_id,
  });

  const supportedMetric =
    progress.status !== "unsupported_metric";

  const evaluationType = supportedMetric
    ? METRIC_TYPES[progress.metric] ??
      "execution_quality"
    : "execution_quality";

  const measuredValue = supportedMetric
    ? progress.actual
    : null;

  const baseline = supportedMetric
    ? progress.baseline
    : null;

  const target = supportedMetric
    ? progress.target
    : null;

  const hasMeasurement =
    supportedMetric &&
    measuredValue !== null &&
    Number.isFinite(measuredValue);

  const evaluationStatus = hasMeasurement
    ? "completed"
    : "insufficient_data";

  const recommendation = !supportedMetric
    ? {
        decision: "unsupported_metric",
        nextStep: "configure_supported_metric",
        reason:
          "This goal metric needs a measurement adapter.",
      }
    : getNextRecommendation(progress);

  // ==================================================
  // 3. PREPARE EVALUATION EVIDENCE
  // ==================================================

  const now = new Date().toISOString();

  const findings = hasMeasurement
    ? (
        `Measured ${progress.metric}: ` +
        `${measuredValue} ${progress.unit}. ` +
        `Baseline: ${baseline ?? "unknown"}. ` +
        `Target: ${target ?? "unknown"}. ` +
        `Remaining gap: ${progress.remainingGap ?? "unknown"}. ` +
        `Target reached: ${progress.targetReached}. ` +
        "Simulated message delivery does not establish " +
        "causal business improvement."
      )
    : recommendation.reason;

  const measurementStart = supportedMetric
    ? progress.measurementWindow?.start ?? null
    : null;

  const measurementEnd = supportedMetric
    ? progress.measurementWindow?.end ?? null
    : null;

  const evaluationData = {
    business_id: businessId,
    run_id: runId,
    evaluation_type: evaluationType,
    status: evaluationStatus,
    measurement_start: measurementStart,
    measurement_end: measurementEnd,
    baseline_value: baseline,
    actual_value: measuredValue,
    metric_name: progress.metric ?? null,
    findings,
    recommendations: [recommendation],
    evaluated_at: now,
  };

  // ==================================================
  // 4. REUSE EXISTING EVALUATION RECORD
  // ==================================================

  const { data: existing, error: lookupError } =
    await supabase
      .from("evaluation_results")
      .select("id")
      .eq("business_id", businessId)
      .eq("run_id", runId)
      .eq("evaluation_type", evaluationType)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (lookupError) throw lookupError;

  let savedEvaluation;

  if (existing) {
    const { data, error } = await supabase
      .from("evaluation_results")
      .update(evaluationData)
      .eq("id", existing.id)
      .eq("business_id", businessId)
      .eq("run_id", runId)
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

  // ==================================================
  // 5. RECORD EVALUATION EVENT
  // ==================================================

  const { error: logError } = await supabase
    .from("execution_logs")
    .insert({
      business_id: businessId,
      run_id: runId,
      event_type: "goal_evaluated",
      severity: "info",
      tool_name: "goal_evaluation",
      details: {
        evaluationId: savedEvaluation.id,
        metric: progress.metric,
        baseline,
        target,
        actual: measuredValue,
        progressPercentage:
          progress.progressPercentage ?? null,
        targetReached:
          progress.targetReached ?? false,
        recommendation,
        evaluationStatus,
        evaluatedAt: now,
        dataSource: "completed_transactions",
        simulationOnly: true,
        causalImpactProven: false,
      },
    });

  if (logError) {
    console.error(
      "Goal evaluation logging failed:",
      logError.message
    );
  }

  // ==================================================
  // 6. RETURN MEASURABLE RESULTS
  // ==================================================

  return {
    success: true,
    evaluationId: savedEvaluation.id,

    businessId,
    runId,
    goalId: run.goal_id,

    runStatus: run.status,
    evaluationStatus,

    metric: progress.metric,
    baseline,
    target,
    actual: measuredValue,

    progressPercentage:
      progress.progressPercentage ?? null,

    targetReached:
      progress.targetReached ?? false,

    measurementWindow:
      progress.measurementWindow ?? null,

    recommendation,

    auditLogged: !logError,
    executionMode: "simulation",

    attribution:
      "Measured business performance; AI intervention impact not established",

    evaluatedAt: now,
  };
}
