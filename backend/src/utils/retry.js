
import { supabase } from "../config/supabase.js";
import { syncAgentRunStatus } from "../services/runLifecycle.service.js";

/**
 * GrowPilot AI — Safe Execution Recovery
 *
 * Recovery rules:
 *
 * 1. Business-scoped action lookup.
 * 2. Only stale executing actions are recoverable.
 * 3. Never resend customer messages.
 * 4. Verify simulated delivery status.
 * 5. Prevent concurrent recovery conflicts.
 * 6. Maintain audit history.
 * 7. Synchronize parent agent run status.
 *
 * No actual SMS, email or WhatsApp is sent.
 */

const MIN_STALE_MINUTES = 5;
const MAX_STALE_MINUTES = 1440;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function recoverStuckAction({
  actionId,
  businessId,
  staleMinutes = 5,
}) {
  // ====================================================
  // 1. VALIDATE INPUT
  // ====================================================

  if (
    typeof actionId !== "string" ||
    !UUID_REGEX.test(actionId)
  ) {
    throw new Error("Valid actionId is required");
  }

  if (
    typeof businessId !== "string" ||
    !UUID_REGEX.test(businessId)
  ) {
    throw new Error("Valid businessId is required");
  }

  if (
    !Number.isInteger(staleMinutes) ||
    staleMinutes < MIN_STALE_MINUTES ||
    staleMinutes > MAX_STALE_MINUTES
  ) {
    throw new Error(
      "staleMinutes must be between 5 and 1440"
    );
  }

  // ====================================================
  // 2. FETCH BUSINESS-SCOPED ACTION
  // ====================================================

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

  // ====================================================
  // 3. CHECK CURRENT STATUS
  // ====================================================

  if (action.status === "completed") {
    return {
      success: true,
      actionId,
      status: "completed",
      recovered: false,
      message: "Action already completed",
    };
  }

  if (action.status !== "executing") {
    throw new Error(
      `Action is not recoverable. Status: ${action.status}`
    );
  }

  // Recovery only supports simulated messages.
  if (
    action.action_type !== "send_message" ||
    action.channel !== "simulation"
  ) {
    throw new Error(
      "Action is not recoverable. Only simulated messages are supported"
    );
  }

  // ====================================================
  // 4. CHECK STALE EXECUTION
  // ====================================================

  const lastUpdated = new Date(
    action.updated_at
  ).getTime();

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

  // ====================================================
  // 5. VERIFY EXISTING DELIVERY
  // ====================================================

  const { data: delivery, error: deliveryError } =
    await supabase
      .from("message_deliveries")
      .select(
        "id, business_id, action_id, channel, status, sent_at"
      )
      .eq("action_id", actionId)
      .eq("business_id", businessId)
      .maybeSingle();

  if (deliveryError) throw deliveryError;

  // Existing but unconfirmed delivery must not
  // be treated as a successful execution.
  if (
    delivery &&
    (
      delivery.channel !== "simulation" ||
      delivery.status !== "sent" ||
      !delivery.sent_at ||
      !Number.isFinite(
        new Date(delivery.sent_at).getTime()
      )
    )
  ) {
    return {
      success: false,
      actionId,
      status: "executing",
      recovered: false,
      deliveryFound: true,
      message:
        "Delivery exists but is not confirmed as sent. Manual review required.",
    };
  }

  // Confirmed delivery -> completed.
  // No delivery -> failed for manual review.
  const nextStatus = delivery
    ? "completed"
    : "failed";

  const recoveredAt = new Date().toISOString();

  // ====================================================
  // 6. CONDITIONAL STATE UPDATE
  // ====================================================

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
      message:
        "Action state changed during recovery",
    };
  }

  // ====================================================
  // 7. RECORD RECOVERY AUDIT EVENT
  // ====================================================

  const { error: logError } = await supabase
    .from("execution_logs")
    .insert({
      business_id: businessId,
      run_id: action.run_id,
      action_id: actionId,

      event_type: delivery
        ? "execution_recovered"
        : "execution_marked_failed",

      severity: delivery
        ? "info"
        : "warning",

      tool_name: "execution_recovery",

      details: {
        previousStatus: "executing",
        newStatus: nextStatus,

        deliveryFound: Boolean(delivery),
        deliveryId: delivery?.id ?? null,

        deliveryStatus:
          delivery?.status ?? null,

        recoveredAt,
        automaticResend: false,
        recoveryMode: "manual_reconciliation",
      },
    });

  if (logError) {
    console.error(
      "Recovery audit logging failed:",
      logError.message
    );
  }

  // ====================================================
  // 8. SYNC PARENT AGENT RUN STATUS
  // ====================================================

  let runLifecycle = {
    updated: false,
    status: null,
  };

  let lifecycleErrorMessage = null;

  try {
    if (action.run_id) {
      runLifecycle = await syncAgentRunStatus(
        action.run_id
      );
    }
  } catch (lifecycleError) {
    lifecycleErrorMessage =
      lifecycleError.message;

    console.error(
      "Recovery lifecycle sync failed:",
      lifecycleErrorMessage
    );
  }

  // ====================================================
  // 9. PREPARE WARNINGS
  // ====================================================

  const warnings = [];

  if (logError) {
    warnings.push(
      "Recovery saved but audit logging failed"
    );
  }

  if (lifecycleErrorMessage) {
    warnings.push(
      "Recovery saved but agent run lifecycle sync failed"
    );
  }

  // ====================================================
  // 10. RETURN RESULT
  // ====================================================

  return {
    success: true,
    actionId,
    recovered: true,
    status: nextStatus,

    deliveryFound: Boolean(delivery),
    auditLogged: !logError,

    runLifecycle,

    message: delivery
      ? "Existing simulated delivery confirmed. Action recovered."
      : "No delivery found. Action marked failed for manual review.",

    ...(warnings.length > 0 && {
      warning: warnings.join("; "),
    }),
  };
}
