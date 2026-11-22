
import { supabase } from "../config/supabase.js";
import { syncAgentRunStatus } from "./runLifecycle.service.js";
/**
 * GrowPilot AI — Human Approval Service
 *
 * Responsibilities:
 * - Fetch pending approval actions
 * - Approve or reject proposed actions
 * - Validate saved AI message drafts before approval
 * - Prevent duplicate approval decisions
 * - Record approval decisions in execution logs
 *
 * IMPORTANT:
 * - Approval does not execute an action
 * - Messaging remains simulation-only
 * - Authentication will be added before deployment
 */

const VALID_DECISIONS = ["approved", "rejected"];

/**
 * Validate a saved message draft before approval.
 *
 * The same draft will later be used during
 * simulated message execution.
 */
function validateMessageDraft(action) {
  const messageDraft = action.payload?.messageDraft;

  if (
    typeof messageDraft !== "string" ||
    messageDraft.trim().length < 10 ||
    messageDraft.length > 2000
  ) {
    const error = new Error(
      "Cannot approve action without a valid saved message draft. Generate and save the AI draft first."
    );

    error.statusCode = 400;
    error.code = "MESSAGE_DRAFT_REQUIRED";

    throw error;
  }

  // Match the English-only validation used
  // during simulated execution.
  const textWithoutEmoji = messageDraft.replace(
    /[\p{Extended_Pictographic}\p{Emoji_Presentation}\uFE0F]/gu,
    ""
  );

  if (/[^\x00-\x7F]/u.test(textWithoutEmoji)) {
    const error = new Error(
      "Cannot approve a message containing unsupported characters. Generate an English-only draft."
    );

    error.statusCode = 400;
    error.code = "INVALID_MESSAGE_LANGUAGE";

    throw error;
  }

  return messageDraft.trim();
}

/**
 * Get all pending approval actions for a business.
 */
export async function getPendingApprovals(businessId) {
  const { data, error } = await supabase
    .from("agent_actions")
    .select(`
      id,
      business_id,
      run_id,
      plan_id,
      customer_id,
      action_type,
      channel,
      payload,
      rationale,
      expected_outcome,
      status,
      created_at
    `)
    .eq("business_id", businessId)
    .eq("status", "pending_approval")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return {
    total: data.length,
    actions: data,
  };
}

/**
 * Fetch a specific action.
 */
export async function getApprovalById(actionId, businessId) {
  const { data, error } = await supabase
    .from("agent_actions")
    .select("*")
    .eq("id", actionId)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) throw error;

  return data;
}

/**
 * Approve or reject an action.
 */

export async function decideApproval({
  actionId,
  businessId,
  decision,
  approvedBy,
  reason = null,
}) {
  // 1. Validate decision.
  if (!VALID_DECISIONS.includes(decision)) {
    throw new Error("Decision must be approved or rejected");
  }

  // 2. Validate approver.
  if (
    typeof approvedBy !== "string" ||
    !approvedBy.trim()
  ) {
    throw new Error("Approver name is required");
  }

  // 3. Rejections require a reason.
  if (
    decision === "rejected" &&
    (
      typeof reason !== "string" ||
      !reason.trim()
    )
  ) {
    throw new Error("Rejection reason is required");
  }

  // 4. Fetch action.
  const action = await getApprovalById(
    actionId,
    businessId
  );

  if (!action) {
    throw new Error("Action not found");
  }

  // 5. Prevent repeated decisions.
  if (action.status !== "pending_approval") {
    throw new Error(
      `Action already processed. Current status: ${action.status}`
    );
  }

  // 6. Enforce simulation-only actions.
  if (action.channel !== "simulation") {
    throw new Error(
      "Only simulation actions are supported"
    );
  }

  // 7. Validate saved draft before message approval.
  // Rejection does not require a saved draft.
  if (
    decision === "approved" &&
    action.action_type === "send_message"
  ) {
    validateMessageDraft(action);
  }

  // 8. Prepare approval/rejection update.
  const updateData =
    decision === "approved"
      ? {
          status: "approved",
          approved_by: approvedBy.trim(),
          approved_at: new Date().toISOString(),
          rejected_reason: null,
        }
      : {
          status: "rejected",
          approved_by: null,
          approved_at: null,
          rejected_reason: reason.trim(),
        };

  // 9. Conditional update prevents duplicate decisions.
  const {
    data: updatedAction,
    error: updateError,
  } = await supabase
    .from("agent_actions")
    .update(updateData)
    .eq("id", actionId)
    .eq("business_id", businessId)
    .eq("status", "pending_approval")
    .select()
    .maybeSingle();

  if (updateError) throw updateError;

  if (!updatedAction) {
    throw new Error(
      "Action was already processed by another request"
    );
  }

  // 10. Record approval/rejection audit event.
  const { error: logError } = await supabase
    .from("execution_logs")
    .insert({
      business_id: businessId,
      run_id: updatedAction.run_id,
      action_id: actionId,
      event_type:
        decision === "approved"
          ? "action_approved"
          : "action_rejected",
      severity: "info",
      details: {
        decision,
        decidedBy: approvedBy.trim(),
        reason:
          decision === "rejected"
            ? reason.trim()
            : null,
        decidedAt: new Date().toISOString(),
        executionTriggered: false,
        messageDraftValidated:
          decision === "approved" &&
          action.action_type === "send_message",
        executionMode: "simulation",
      },
    });

  // 11. Synchronize parent agent run status.
  // A lifecycle sync failure must not undo a saved decision.
  let runLifecycle = null;
  let lifecycleErrorMessage = null;

  try {
    runLifecycle = await syncAgentRunStatus(
      updatedAction.run_id
    );
  } catch (lifecycleError) {
    lifecycleErrorMessage = lifecycleError.message;

    console.error(
      "Agent run lifecycle sync failed:",
      lifecycleErrorMessage
    );
  }

  // 12. Return audit/lifecycle warnings if needed.
  const warnings = [];

  if (logError) {
    console.error(
      "Approval audit logging failed:",
      logError.message
    );

    warnings.push(
      "Decision saved but audit logging failed"
    );
  }

  if (lifecycleErrorMessage) {
    warnings.push(
      "Decision saved but agent run lifecycle sync failed"
    );
  }

  // 13. Return final result.
  return {
    success: true,
    auditLogged: !logError,
    message:
      decision === "approved"
        ? "Action approved successfully"
        : "Action rejected successfully",
    action: updatedAction,
    runLifecycle,
    ...(warnings.length > 0 && {
      warning: warnings.join("; "),
    }),
  };
}

/**
 * Fetch completed simulated executions for a business.
 *
 * Read-only query.
 * Results are ordered by execution date (newest first).
 */
export async function getExecutionHistory(businessId) {
  const { data, error } = await supabase
    .from("agent_actions")
    .select(`
      id,
      business_id,
      run_id,
      customer_id,
      action_type,
      channel,
      payload,
      rationale,
      status,
      approved_by,
      approved_at,
      executed_at,
      created_at
    `)
    .eq("business_id", businessId)
    .eq("status", "completed")
    .eq("channel", "simulation")
    .not("executed_at", "is", null)
    .order("executed_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  return {
    total: data.length,
    actions: data,
  };
}

/**
 * Fetch approved actions awaiting simulation.
 *
 * Read-only query.
 * Returns the latest 100 approved actions.
 */
export async function getApprovedActions(businessId) {
  const { data, error } = await supabase
    .from("agent_actions")
    .select(`
      id,
      business_id,
      run_id,
      customer_id,
      action_type,
      channel,
      payload,
      rationale,
      status,
      approved_by,
      approved_at,
      executed_at,
      created_at
    `)
    .eq("business_id", businessId)
    .eq("status", "approved")
    .eq("channel", "simulation")
    .order("approved_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  return {
    total: data.length,
    actions: data,
  };
}
