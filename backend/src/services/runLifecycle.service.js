
import { supabase } from "../config/supabase.js";

/**
 * GrowPilot AI — Agent Run Lifecycle
 *
 * Recalculate parent run status using action statuses.
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

export async function syncAgentRunStatus(runId) {
  if (!runId) {
    throw new Error("runId is required");
  }

  // Fetch all actions belonging to the run.
  const { data: actions, error: actionsError } =
    await supabase
      .from("agent_actions")
      .select("id, status")
      .eq("run_id", runId);

  if (actionsError) throw actionsError;

  if (!actions?.length) {
    return {
      updated: false,
      reason: "No actions found",
    };
  }

  const statuses = actions.map((action) => action.status);

  let nextStatus;

  if (statuses.some((status) => OPEN_STATUSES.includes(status))) {
    nextStatus = "waiting_approval";
  } else if (statuses.some((status) => status === "failed")) {
    nextStatus = "failed";
  } else if (statuses.some((status) => status === "completed")) {
    nextStatus = "completed";
  } else if (
    statuses.every((status) =>
      ["rejected", "cancelled"].includes(status)
    )
  ) {
    nextStatus = "cancelled";
  } else {
    return {
      updated: false,
      reason: "Unsupported action status combination",
      statuses,
    };
  }

  // Read current run.
  const { data: run, error: runError } = await supabase
    .from("agent_runs")
    .select("id, status")
    .eq("id", runId)
    .maybeSingle();

  if (runError) throw runError;
  if (!run) throw new Error("Agent run not found");

  if (run.status === nextStatus) {
    return {
      updated: false,
      runId,
      status: nextStatus,
      reason: "Status already up to date",
    };
  }

  const isTerminal = TERMINAL_STATUSES.includes(nextStatus);

  // Update parent agent run.
  const { data: updatedRun, error: updateError } =
    await supabase
      .from("agent_runs")
      .update({
        status: nextStatus,
        finished_at: isTerminal
          ? new Date().toISOString()
          : null,
      })
      .eq("id", runId)
      .select("id, status, finished_at")
      .single();

  if (updateError) throw updateError;

  return {
    updated: true,
    runId,
    previousStatus: run.status,
    status: updatedRun.status,
    finishedAt: updatedRun.finished_at,
  };
}
