
import { supabase } from "../config/supabase.js";

/**
 * GrowPilot AI — Safe Execution Recovery
 *
 * Handles actions stuck in "executing" state.
 *
 * Rules:
 * 1. Never resend a message during recovery.
 * 2. Check whether a delivery already exists.
 * 3. Reconcile successful deliveries.
 * 4. Mark unresolved executions as failed.
 * 5. Record recovery events.
 *
 * This module does not automatically retry failed actions.
 */

const MIN_STALE_MINUTES = 5;
const MAX_STALE_MINUTES = 1440;

export async function recoverStuckAction({
  actionId,
  businessId,
  staleMinutes = 5,
}) {
  if (
    !Number.isInteger(staleMinutes) ||
    staleMinutes < MIN_STALE_MINUTES ||
    staleMinutes > MAX_STALE_MINUTES
  ) {
    throw new Error(
      "staleMinutes must be between 5 and 1440"
    );
  }

  // 1. Fetch current action
  const { data: action, error: actionError } =
    await supabase
      .from("agent_actions")
      .select("*")
      .eq("id", actionId)
      .eq("business_id", businessId)
      .maybeSingle();

  if (actionError) throw actionError;

  if (!action) {
    throw new Error("Action not found");
  }

  // 2. Already completed: nothing to recover
  if (action.status === "completed") {
    return {
      success: true,
      actionId,
      status: "completed",
      recovered: false,
      message: "Action already completed",
    };
  }

  // Only executing actions are eligible
  if (action.status !== "executing") {
    throw new Error(
      `Action is not recoverable. Status: ${action.status}`
    );
  }

  // 3. Avoid interfering with ongoing execution
  const lastUpdated = new Date(action.updated_at).getTime();

  if (!Number.isFinite(lastUpdated)) {
    throw new Error("Invalid action timestamp");
  }

  const ageMinutes =
    (Date.now() - lastUpdated) / (1000 * 60);

  if (ageMinutes < staleMinutes) {
    return {
      success: true,
      actionId,
      status: "executing",
      recovered: false,
      message: "Execution is not stale yet",
    };
  }

  // 4. Check delivery before changing state
  const { data: delivery, error: deliveryError } =
    await supabase
      .from("message_deliveries")
      .select("id, status, sent_at")
      .eq("action_id", actionId)
      .eq("business_id", businessId)
      .maybeSingle();

  if (deliveryError) throw deliveryError;

  const nextStatus = delivery ? "completed" : "failed";

  // 5. Conditional update prevents overwriting
  // an action changed by another process
  const { data: updatedAction, error: updateError } =
    await supabase
      .from("agent_actions")
      .update({
        status: nextStatus,
        executed_at: delivery
          ? delivery.sent_at
          : null,
        last_error: delivery
          ? null
          : "Execution interrupted before delivery confirmation",
      })
      .eq("id", actionId)
      .eq("business_id", businessId)
      .eq("status", "executing")
      .eq("updated_at", action.updated_at)
      .select("id, status")
      .maybeSingle();

  if (updateError) throw updateError;

  if (!updatedAction) {
    return {
      success: false,
      actionId,
      recovered: false,
      message: "Action state changed during recovery",
    };
  }

  // 6. Record recovery event
  const { error: logError } = await supabase
    .from("execution_logs")
    .insert({
      business_id: businessId,
      run_id: action.run_id,
      action_id: actionId,
      event_type: delivery
        ? "execution_recovered"
        : "execution_marked_failed",
      severity: delivery ? "info" : "warning",
      tool_name: "execution_recovery",
      details: {
        previousStatus: "executing",
        newStatus: nextStatus,
        deliveryFound: Boolean(delivery),
        deliveryId: delivery?.id ?? null,
        recoveredAt: new Date().toISOString(),
        automaticResend: false,
      },
    });

  if (logError) {
    console.error(
      "Recovery audit logging failed:",
      logError.message
    );
  }

  return {
    success: true,
    actionId,
    recovered: true,
    status: nextStatus,
    deliveryFound: Boolean(delivery),
    auditLogged: !logError,
    message: delivery
      ? "Existing delivery confirmed. Action recovered."
      : "No delivery found. Action marked failed for manual review.",
  };
}
