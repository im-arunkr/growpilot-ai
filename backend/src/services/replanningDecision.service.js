
/**
 * GrowPilot AI - Replanning Decision Engine
 *
 * Pure decision logic.
 * No database writes.
 * No messages sent.
 * No automatic action execution.
 */

export function decideNextWorkerStep({
  evaluation,
  actionSummary = {},
  newBusinessEvidence = false,
  replanCount = 0,
  maxReplans = 3,
}) {
  const base = {
    decidedAt: new Date().toISOString(),
    requiresHumanApproval: true,
    executeAutomatically: false,
  };

  const pendingApproval =
    Number(actionSummary.pendingApproval || 0);

  const approved =
    Number(actionSummary.approved || 0);

  const executing =
    Number(actionSummary.executing || 0);

  // 1. Never start another planning cycle
  // while earlier work remains unresolved.
  if (pendingApproval > 0 || approved > 0 || executing > 0) {
    return {
      ...base,
      decision: "wait_for_existing_actions",
      shouldReplan: false,
      reason:
        "Existing actions are pending approval or execution.",
      nextStep: "resolve_existing_actions",
    };
  }

  // 2. No trustworthy measurement available.
  if (
    !evaluation ||
    evaluation.success !== true ||
    evaluation.evaluationStatus !== "completed"
  ) {
    return {
      ...base,
      decision: "wait_for_measurement",
      shouldReplan: false,
      reason:
        "A completed business goal evaluation is required.",
      nextStep: "collect_business_data",
    };
  }

  const actual = Number(evaluation.actual);
  const target = Number(evaluation.target);

  if (
    evaluation.actual == null ||
    evaluation.target == null ||
    !Number.isFinite(actual) ||
    !Number.isFinite(target)
  ) {
    return {
      ...base,
      decision: "manual_review",
      shouldReplan: false,
      reason: "Invalid or missing goal measurements.",
      nextStep: "review_goal_configuration",
    };
  }

  // 3. Stop outreach planning when goal is reached.
  if (actual >= target) {
    return {
      ...base,
      decision: "goal_target_reached",
      shouldReplan: false,
      reason:
        "Measured business performance has reached the target.",
      nextStep: "review_goal_completion",
      actual,
      target,
    };
  }

  // 4. Prevent endless replanning loops.
  if (replanCount >= maxReplans) {
    return {
      ...base,
      decision: "manual_review",
      shouldReplan: false,
      reason: "Maximum replanning cycles reached.",
      nextStep: "owner_strategy_review",
      actual,
      target,
    };
  }

  // 5. Do not treat simulated messages as
  // proof of customer behavior changes.
  if (newBusinessEvidence !== true) {
    return {
      ...base,
      decision: "wait_for_new_evidence",
      shouldReplan: false,
      reason:
        "No new observed business evidence is available.",
      nextStep: "wait_for_transaction_updates",
      actual,
      target,
    };
  }

  // 6. Target not reached and new evidence exists.
  // Planning is permitted; execution still
  // requires human approval.
  return {
    ...base,
    decision: "replan_required",
    shouldReplan: true,
    reason:
      "Goal remains below target and new business evidence is available.",
    nextStep: "generate_next_retention_plan",
    actual,
    target,
    remainingGap: Math.max(0, target - actual),
    nextReplanCount: replanCount + 1,
  };
}
