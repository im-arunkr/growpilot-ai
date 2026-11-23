
import { supabase } from "../config/supabase.js";
import { syncAgentRunStatus } from "../services/runLifecycle.service.js";

/**
 * GrowPilot AI — Simulated Message Execution
 *
 * Security:
 * - Business-scoped action access
 * - Human approval required
 * - Simulation-only execution
 * - Saved draft reuse
 * - Conditional execution claim
 * - Business-scoped delivery recovery
 *
 * No real messages are sent.
 */

function getSavedMessage(action) {
  const message = action.payload?.messageDraft;

  if (
    typeof message !== "string" ||
    message.trim().length < 10 ||
    message.length > 2000
  ) {
    throw new Error(
      "No valid saved message draft found. Generate and save an AI draft before approving this action."
    );
  }

  // Allow English text and emoji.
  const textWithoutEmoji = message.replace(
    /[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F]/gu,
    ""
  );

  if (/[^\x00-\x7F]/u.test(textWithoutEmoji)) {
    throw new Error(
      "Saved message contains unsupported characters. Please review the draft."
    );
  }

  return message.trim();
}

/**
 * Execute a previously approved message action.
 *
 * Execution mode: simulation only.
 *
 * Caller must have already verified business
 * membership and action ownership.
 */
export async function executeApprovedMessage({
  actionId,
  businessId,
}) {
  // ====================================================
  // 1. FETCH BUSINESS-SCOPED ACTION
  // ====================================================

  const { data: action, error: fetchError } =
    await supabase
      .from("agent_actions")
      .select("*")
      .eq("id", actionId)
      .eq("business_id", businessId)
      .maybeSingle();

  if (fetchError) throw fetchError;

  if (!action) {
    throw new Error("Action not found");
  }

  // ====================================================
  // 2. VERIFY HUMAN APPROVAL
  // ====================================================

  if (action.status !== "approved") {
    throw new Error(
      `Action cannot execute. Current status: ${action.status}`
    );
  }

  if (action.requires_approval && !action.approved_at) {
    throw new Error("Human approval is required");
  }

  // ====================================================
  // 3. ENFORCE SIMULATION-ONLY EXECUTION
  // ====================================================

  if (
    action.action_type !== "send_message" ||
    action.channel !== "simulation"
  ) {
    throw new Error(
      "Only simulated message actions are supported"
    );
  }

  // ====================================================
  // 4. VALIDATE SAVED MESSAGE
  // ====================================================

  const approvedMessage = getSavedMessage(action);

  // ====================================================
  // 5. CONDITIONALLY CLAIM EXECUTION
  // ====================================================

  const { data: claimedAction, error: claimError } =
    await supabase
      .from("agent_actions")
      .update({
        status: "executing",
      })
      .eq("id", actionId)
      .eq("business_id", businessId)
      .eq("status", "approved")
      .eq("action_type", "send_message")
      .eq("channel", "simulation")
      .select()
      .maybeSingle();

  if (claimError) throw claimError;

  if (!claimedAction) {
    throw new Error(
      "Action was already claimed by another execution"
    );
  }

  try {
    // ================================================
    // 6. REVALIDATE CLAIMED ACTION
    // ================================================

    if (
      claimedAction.requires_approval &&
      !claimedAction.approved_at
    ) {
      throw new Error("Human approval is required");
    }

    const message = getSavedMessage(claimedAction);

    if (message !== approvedMessage) {
      throw new Error(
        "Message draft changed during execution. Manual review required."
      );
    }

    // ================================================
    // 7. SAVE SIMULATED DELIVERY
    // ================================================

    // UNIQUE(action_id) should be enforced
    // by the database schema.
    const { data: delivery, error: deliveryError } =
      await supabase
        .from("message_deliveries")
        .insert({
          business_id: businessId,
          action_id: actionId,
          customer_id: claimedAction.customer_id,
          channel: "simulation",
          destination: "simulated-inbox",
          message_body: message,
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

    if (deliveryError) throw deliveryError;

    // ================================================
    // 8. COMPLETE ACTION
    // ================================================

    const executedAt = new Date().toISOString();

    const {
      data: completedAction,
      error: completeError,
    } = await supabase
      .from("agent_actions")
      .update({
        status: "completed",
        executed_at: executedAt,
        last_error: null,
      })
      .eq("id", actionId)
      .eq("business_id", businessId)
      .eq("status", "executing")
      .select("id, status")
      .maybeSingle();

    if (completeError) throw completeError;

    if (!completedAction) {
      throw new Error(
        "Action completion status update was not confirmed"
      );
    }

    // ================================================
    // 9. WRITE EXECUTION LOG
    // ================================================

    const { error: logError } = await supabase
      .from("execution_logs")
      .insert({
        business_id: businessId,
        run_id: claimedAction.run_id,
        action_id: actionId,
        event_type: "simulated_message_sent",
        severity: "info",
        tool_name: "send_message",
        details: {
          deliveryId: delivery.id,
          channel: "simulation",
          messageSource:
            claimedAction.payload?.messageDraftSource ??
            "saved_draft",
          message,
          executedAt,
        },
      });

    if (logError) {
      console.error(
        "Execution log failed:",
        logError.message
      );
    }

    // ================================================
    // 10. SYNC PARENT AGENT RUN
    // ================================================

    let runLifecycle = {
      updated: false,
      status: null,
    };

    try {
      runLifecycle = await syncAgentRunStatus(
        claimedAction.run_id
      );
    } catch (lifecycleError) {
      console.error(
        "Agent run lifecycle sync failed:",
        lifecycleError.message
      );
    }

    // ================================================
    // 11. RETURN RESULT
    // ================================================

    return {
      success: true,
      actionId,
      status: "completed",
      executionMode: "simulation",
      deliveryId: delivery.id,
      message,
      messageSource:
        claimedAction.payload?.messageDraftSource ??
        "saved_draft",
      auditLogged: !logError,
      runLifecycle,
      executedAt,
    };
  } catch (error) {
    // ================================================
    // 12. SAFE RECOVERY HANDLING
    // ================================================

    // Include BOTH business and action filters.
    // Do not modify another business's delivery.
    const {
      data: existingDelivery,
      error: lookupError,
    } = await supabase
      .from("message_deliveries")
      .select("id")
      .eq("business_id", businessId)
      .eq("action_id", actionId)
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Delivery recovery lookup failed:",
        lookupError.message
      );
    }

    // Only mark as failed when the delivery lookup
    // succeeded and confirmed no delivery exists.
    if (!lookupError && !existingDelivery) {
      const { error: failureUpdateError } =
        await supabase
          .from("agent_actions")
          .update({
            status: "failed",
            last_error: String(error.message).slice(
              0,
              2000
            ),
          })
          .eq("id", actionId)
          .eq("business_id", businessId)
          .eq("status", "executing");

      if (failureUpdateError) {
        console.error(
          "Failed to mark action as failed:",
          failureUpdateError.message
        );
      }
    }

    // If delivery exists or lookup failed, retain
    // executing status for manual reconciliation.
    throw error;
  }
}
