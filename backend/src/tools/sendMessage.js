
import { supabase } from "../config/supabase.js";
import { syncAgentRunStatus } from "../services/runLifecycle.service.js";
/**
 * GrowPilot AI — Simulated Message Execution
 *
 * Responsibilities:
 * - Execute only human-approved actions
 * - Use the saved AI-generated message draft
 * - Never generate a new message during execution
 * - Prevent duplicate execution
 * - Save simulated message deliveries
 * - Maintain execution logs
 * - Support crash recovery
 *
 * IMPORTANT:
 * No real SMS, WhatsApp or email is sent.
 */

/**
 * Get the AI message saved during the draft stage.
 *
 * Never generate a new message after owner approval.
 * The approved draft must be the executed message.
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

  // Reject non-English scripts in the final message.
  // Allow common emoji and variation selectors.
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
 */
export async function executeApprovedMessage({
  actionId,
  businessId,
}) {
  // 1. Fetch the action.
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

  // 2. Ensure explicit human approval.
  if (action.status !== "approved") {
    throw new Error(
      `Action cannot execute. Current status: ${action.status}`
    );
  }

  if (action.requires_approval && !action.approved_at) {
    throw new Error("Human approval is required");
  }

  // 3. Enforce simulation-only execution.
  if (
    action.action_type !== "send_message" ||
    action.channel !== "simulation"
  ) {
    throw new Error(
      "Only simulated message actions are supported"
    );
  }

  // 4. Validate saved AI message BEFORE claiming execution.
  // Missing drafts should not turn into failed executions.
  const approvedMessage = getSavedMessage(action);

  // 5. Atomically claim the action.
  // Only one request can transition approved -> executing.
  const { data: claimedAction, error: claimError } =
    await supabase
      .from("agent_actions")
      .update({
        status: "executing",
      })
      .eq("id", actionId)
      .eq("business_id", businessId)
      .eq("status", "approved")
      .select()
      .maybeSingle();

  if (claimError) throw claimError;

  if (!claimedAction) {
    throw new Error(
      "Action was already claimed by another execution"
    );
  }

  try {
    // 6. Re-read the saved draft from the claimed action.
    const message = getSavedMessage(claimedAction);

    // Never execute a different draft from the one validated.
    if (message !== approvedMessage) {
      throw new Error(
        "Message draft changed during execution. Manual review required."
      );
    }

    // 7. Record the simulated delivery.
    // UNIQUE(action_id) prevents duplicate delivery records.
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

    // 8. Complete the action.
    const executedAt = new Date().toISOString();

    const { data: completedAction, error: completeError } =
      await supabase
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

    // 9. Record the execution event.
    const { error: logError } =
      await supabase
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

    // 10. Synchronize the parent agent run status.
    // A lifecycle sync failure must not trigger a retry
    // of an already saved simulated delivery.
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

    // 10. Return the execution result.
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
    // 11. Recovery safety.
    // If a delivery exists, don't automatically retry it.
    const { data: existingDelivery, error: lookupError } =
      await supabase
        .from("message_deliveries")
        .select("id")
        .eq("action_id", actionId)
        .maybeSingle();

    if (lookupError) {
      console.error(
        "Delivery recovery lookup failed:",
        lookupError.message
      );
    }

    if (!lookupError && !existingDelivery) {
      const { error: failureUpdateError } =
        await supabase
          .from("agent_actions")
          .update({
            status: "failed",
            last_error: error.message,
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

    // If delivery already exists or lookup is uncertain,
    // retain executing status for recovery reconciliation.
    throw error;
  }
}
