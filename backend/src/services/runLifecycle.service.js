
import { supabase } from "../config/supabase.js";

/**
 * GrowPilot AI — Durable Agent Run Lifecycle
 *
 * Responsibilities:
 * - Recalculate run status from saved actions
 * - Preserve existing execution checkpoint
 * - Record the next resumable workflow step
 * - Avoid repeating completed actions
 * - Support approval, execution and recovery
 *
 * This service does NOT send messages.
 */

const OPEN_STATUSES = [
  "pending_approval",
  "approved",
  "executing",
];

const TERMINAL_STATUSES = [
  "completed",
  "rejected",
  "cancelled",
  "failed",
];

function summarizeActions(actions) {
  const counts = {
    total: actions.length,
    pendingApproval: 0,
    approved: 0,
    executing: 0,
    completed: 0,
    rejected: 0,
    cancelled: 0,
    failed: 0,
  };

  for (const action of actions) {
    switch (action.status) {
      case "pending_approval":
        counts.pendingApproval++;
        break;
      case "approved":
        counts.approved++;
        break;
      case "executing":
        counts.executing++;
        break;
      case "completed":
        counts.completed++;
        break;
      case "rejected":
        counts.rejected++;
        break;
      case "cancelled":
        counts.cancelled++;
        break;
      case "failed":
        counts.failed++;
        break;
    }
  }

  return counts;
}

function resolveLifecycle(actions, counts) {
  const statuses = actions.map(
    (action) => action.status
  );

  if (
    statuses.some((status) =>
      !OPEN_STATUSES.includes(status) &&
      !TERMINAL_STATUSES.includes(status)
    )
  ) {
    return null;
  }

  // An execution is currently in progress.
  if (counts.executing > 0) {
    return {
      status: "waiting_approval",
      currentStep: "execution_in_progress",
      resumeFrom: "execution_reconciliation",
    };
  }

  // Some human approvals are still pending.
  if (counts.pendingApproval > 0) {
    return {
      status: "waiting_approval",
      currentStep: "awaiting_human_approval",
      resumeFrom: "approval_resolution",
    };
  }

  // Approved actions are ready for execution.
  if (counts.approved > 0) {
    return {
      status: "waiting_approval",
      currentStep: "ready_for_execution",
      resumeFrom: "execute_approved_actions",
    };
  }

  // No open actions remain.
  if (counts.failed > 0) {
    return {
      status: "failed",
      currentStep: "execution_failed",
      resumeFrom: "manual_failure_review",
    };
  }

  if (counts.completed > 0) {
    return {
      status: "completed",
      currentStep: "evaluation_pending",
      resumeFrom: "goal_evaluation",
    };
  }

  if (
    counts.rejected + counts.cancelled ===
    counts.total
  ) {
    return {
      status: "cancelled",
      currentStep: "actions_declined",
      resumeFrom: null,
    };
  }

  return null;
}

/**
 * Synchronize a persisted run with its actions.
 *
 * Existing approval and execution services
 * already call this function.
 */
export async function syncAgentRunStatus(runId) {
  if (!runId) {
    throw new Error("runId is required");
  }

  // Retry once if another process updated the run.
  for (let attempt = 0; attempt < 2; attempt++) {

    // 1. Read run and its existing checkpoint.
    const { data: run, error: runError } =
      await supabase
        .from("agent_runs")
        .select(
          "id, business_id, status, current_step, checkpoint, updated_at, finished_at"
        )
        .eq("id", runId)
        .maybeSingle();

    if (runError) throw runError;

    if (!run) {
      throw new Error("Agent run not found");
    }

    // 2. Load business-scoped actions.
    const { data: actions, error: actionsError } =
      await supabase
        .from("agent_actions")
        .select("id, status")
        .eq("run_id", runId)
        .eq("business_id", run.business_id);

    if (actionsError) throw actionsError;

    if (!actions?.length) {
      return {
        updated: false,
        runId,
        reason: "No actions found",
      };
    }

    // 3. Determine the next workflow step.
    const counts = summarizeActions(actions);

    const lifecycle = resolveLifecycle(
      actions,
      counts
    );

    if (!lifecycle) {
      return {
        updated: false,
        runId,
        reason: "Unsupported action state",
        actionSummary: counts,
      };
    }

    // 4. Preserve the saved execution context.
    const checkpoint =
      run.checkpoint &&
      typeof run.checkpoint === "object" &&
      !Array.isArray(run.checkpoint)
        ? run.checkpoint
        : {};

    const previousWorkflow =
      checkpoint.workflow &&
      typeof checkpoint.workflow === "object" &&
      !Array.isArray(checkpoint.workflow)
        ? checkpoint.workflow
        : {};

    const now = new Date().toISOString();

    const updatedCheckpoint = {
      ...checkpoint,

      version: 2,

      workflow: {
        ...previousWorkflow,

        currentStep: lifecycle.currentStep,
        resumeFrom: lifecycle.resumeFrom,

        pendingApproval: counts.pendingApproval,
        approvedActions: counts.approved,
        executingActions: counts.executing,
        completedActions: counts.completed,
        failedActions: counts.failed,
        rejectedActions: counts.rejected,

        lastSynchronizedAt: now,
      },

      actionSummary: counts,
    };

    // 5. Avoid unnecessary updates when state
    // has not changed.
    if (
      run.status === lifecycle.status &&
      run.current_step === lifecycle.currentStep &&
      previousWorkflow.resumeFrom ===
        lifecycle.resumeFrom &&
      checkpoint.actionSummary &&
      JSON.stringify(checkpoint.actionSummary) ===
        JSON.stringify(counts)
    ) {
      return {
        updated: false,
        runId,
        status: run.status,
        currentStep: run.current_step,
        resumeFrom: lifecycle.resumeFrom,
        actionSummary: counts,
        reason: "Lifecycle already synchronized",
      };
    }

    const isTerminal =
      TERMINAL_STATUSES.includes(
        lifecycle.status
      );

    // 6. Update status and checkpoint together.
    // updated_at condition prevents overwriting
    // a concurrently modified run checkpoint.
    const {
      data: updatedRun,
      error: updateError,
    } = await supabase
      .from("agent_runs")
      .update({
        status: lifecycle.status,
        current_step: lifecycle.currentStep,
        checkpoint: updatedCheckpoint,

        finished_at: isTerminal
          ? run.finished_at ?? now
          : null,
      })
      .eq("id", runId)
      .eq("business_id", run.business_id)
      .eq("updated_at", run.updated_at)
      .select(
        "id, status, current_step, finished_at"
      )
      .maybeSingle();

    if (updateError) throw updateError;

    // Another writer changed the run.
    // Retry with fresh state.
    if (!updatedRun) {
      continue;
    }

    return {
      updated: true,
      runId,

      previousStatus: run.status,
      status: updatedRun.status,

      currentStep: updatedRun.current_step,
      resumeFrom: lifecycle.resumeFrom,

      actionSummary: counts,
      finishedAt: updatedRun.finished_at,
    };
  }

  return {
    updated: false,
    runId,
    reason:
      "Concurrent lifecycle update detected. Retry required.",
  };
}
