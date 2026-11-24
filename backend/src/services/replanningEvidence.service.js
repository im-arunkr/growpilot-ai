
import { supabase } from "../config/supabase.js";

/**
 * Detect new completed business transactions
 * since the previous goal evaluation.
 *
 * Read-only.
 * No new agent runs or messages are created.
 */
export async function getReplanningEvidence({
  businessId,
  runId,
}) {
  if (!businessId || !runId) {
    throw new Error("businessId and runId are required");
  }

  // Confirm the run belongs to this business.
  const { data: run, error: runError } = await supabase
    .from("agent_runs")
    .select("id, goal_id")
    .eq("id", runId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (runError) throw runError;

  if (!run) {
    throw new Error("Agent run not found");
  }

  // Find the previous persisted evaluation.
  // This must be read BEFORE the current
  // evaluation overwrites the existing record.
  const { data: previous, error: evaluationError } =
    await supabase
      .from("evaluation_results")
      .select("id, evaluated_at")
      .eq("business_id", businessId)
      .eq("run_id", runId)
      .order("evaluated_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

  if (evaluationError) throw evaluationError;

  if (!previous?.evaluated_at) {
    return {
      newBusinessEvidence: false,
      previousEvaluationAt: null,
      newCompletedTransactions: 0,
      reason:
        "No previous evaluation exists for comparison.",
    };
  }

  const previousEvaluationAt = previous.evaluated_at;

  if (
    Number.isNaN(
      new Date(previousEvaluationAt).getTime()
    )
  ) {
    return {
      newBusinessEvidence: false,
      previousEvaluationAt: null,
      newCompletedTransactions: 0,
      reason: "Invalid previous evaluation timestamp.",
    };
  }

  // Only count completed transactions occurring
  // after the last evaluation.
  const { count, error: transactionError } =
    await supabase
      .from("transactions")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("business_id", businessId)
      .eq("status", "completed")
      .gt("occurred_at", previousEvaluationAt)
      .lte("occurred_at", new Date().toISOString());

  if (transactionError) throw transactionError;

  const newCompletedTransactions = count ?? 0;

  return {
    newBusinessEvidence: newCompletedTransactions > 0,
    previousEvaluationAt,
    newCompletedTransactions,
    reason:
      newCompletedTransactions > 0
        ? "New completed transactions detected after previous evaluation."
        : "No newly completed transactions since previous evaluation.",
  };
}
