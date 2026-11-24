
import { supabase } from "../config/supabase.js";
import { runAgent } from "../agent/agentRunner.js";

/**
 * GrowPilot AI - Autonomous Replanning Orchestrator
 *
 * Responsibilities:
 * - Start a new planning cycle when eligible
 * - Prevent duplicate cycles for a parent run
 * - Limit cycles to 3 per business goal
 * - Reuse the existing Agent Runner
 * - Persist successor run ID
 * - Preserve human approval requirements
 *
 * No real customer messages are sent.
 */

const MAX_REPLANS = 3;

export async function orchestrateReplanning({
  businessId,
  parentRunId,
  goalId,
  decision,
  evidence,
}) {
  if (!businessId || !parentRunId || !goalId) {
    throw new Error(
      "businessId, parentRunId and goalId are required"
    );
  }

  // 1. Do nothing unless the decision permits replanning.
  if (
    decision?.shouldReplan !== true ||
    evidence?.newBusinessEvidence !== true
  ) {
    return {
      started: false,
      reason: "Replanning conditions not satisfied",
    };
  }

  // 2. Check the parent run and its goal ownership.
  const { data: parent, error: parentError } =
    await supabase
      .from("agent_runs")
      .select("id, goal_id, business_id")
      .eq("id", parentRunId)
      .eq("business_id", businessId)
      .eq("goal_id", goalId)
      .maybeSingle();

  if (parentError) throw parentError;

  if (!parent) {
    throw new Error("Parent worker run not found");
  }

  // 3. Check for an existing cycle BEFORE creating another.
  const { data: existing, error: existingError } =
    await supabase
      .from("agent_replanning_cycles")
      .select("id, status, next_run_id, cycle_number")
      .eq("business_id", businessId)
      .eq("parent_run_id", parentRunId)
      .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    return {
      started: false,
      duplicatePrevented: true,
      cycleId: existing.id,
      cycleNumber: existing.cycle_number,
      nextRunId: existing.next_run_id,
      status: existing.status,
      reason: "A replanning cycle already exists for this run",
    };
  }

  // 4. Count existing cycles for this business goal.
  const { count, error: countError } =
    await supabase
      .from("agent_replanning_cycles")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("business_id", businessId)
      .eq("goal_id", goalId);

  if (countError) throw countError;

  const cycleNumber = (count ?? 0) + 1;

  if (cycleNumber > MAX_REPLANS) {
    return {
      started: false,
      reason: "Maximum replanning cycles reached",
      requiresHumanReview: true,
      cycleNumber,
    };
  }

  // 5. Reserve the successor cycle.
  // Unique parent_run_id blocks concurrent duplicate
  // reservations for the same parent.
  const { data: cycle, error: reservationError } =
    await supabase
      .from("agent_replanning_cycles")
      .insert({
        business_id: businessId,
        goal_id: goalId,
        parent_run_id: parentRunId,
        cycle_number: cycleNumber,
        status: "reserved",
        evidence_timestamp:
          evidence.previousEvaluationAt ??
          new Date().toISOString(),
        evidence_count:
          evidence.newCompletedTransactions ?? 0,
        decision,
      })
      .select("id")
      .single();

  if (reservationError) {
    if (reservationError.code === "23505") {
      return {
        started: false,
        duplicatePrevented: true,
        reason:
          "Another request reserved the replanning cycle",
      };
    }

    throw reservationError;
  }

  // 6. Mark the cycle as planning.
  const { error: planningError } = await supabase
    .from("agent_replanning_cycles")
    .update({
      status: "planning",
      updated_at: new Date().toISOString(),
    })
    .eq("id", cycle.id)
    .eq("status", "reserved");

  if (planningError) throw planningError;

  try {
    // 7. Reuse existing planning and persistence.
    // Existing agent runner creates actions that
    // require human approval.
    const result = await runAgent({
      businessId,
      goalId,
      goal: "customer_retention",
      limit: 10,
    });

    if (!result.success || !result.persisted) {
      throw new Error(
        result.message ??
          "Successor planning run was not persisted"
      );
    }

    // 8. Store successor run ID.
    const { error: completeError } = await supabase
      .from("agent_replanning_cycles")
      .update({
        status: "completed",
        next_run_id: result.runId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cycle.id);

    if (completeError) throw completeError;

    return {
      started: true,
      cycleId: cycle.id,
      cycleNumber,
      parentRunId,
      nextRunId: result.runId,
      newActions: result.persistence.savedActions,
      status: "awaiting_human_approval",
      executionMode: "simulation",
      message:
        "New retention plan saved for owner approval",
    };
  } catch (error) {
    // Do not automatically retry an uncertain
    // planning attempt: it might have already
    // persisted a successor run.
    const { error: failureLogError } = await supabase
      .from("agent_replanning_cycles")
      .update({
        status: "needs_attention",
        error_message: error.message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cycle.id);

    if (failureLogError) {
      console.error(
        "Unable to save replanning failure:",
        failureLogError.message
      );
    }

    return {
      started: false,
      cycleId: cycle.id,
      status: "needs_attention",
      reason: error.message,
      requiresHumanReview: true,
    };
  }
}
