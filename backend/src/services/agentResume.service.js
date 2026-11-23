
import { supabase } from "../config/supabase.js";

import { executeApprovedMessage } from "../tools/sendMessage.js";

import { syncAgentRunStatus } from "./runLifecycle.service.js";
import { evaluateAgentGoal } from "./goalEvaluation.service.js";
/**
 * GrowPilot AI — Autonomous Resume Executor
 *
 * Responsibilities:
 * - Resume a persisted agent run
 * - Respect pending human approvals
 * - Execute approved simulated actions
 * - Never repeat completed actions
 * - Preserve interrupted execution state
 * - Synchronize checkpoints
 *
 * No real messages are sent.
 *
 * IMPORTANT:
 * Caller must verify user authentication,
 * business membership and execution permission.
 */

export async function resumeAgentRun({
    runId,
    businessId,
}) {
    if (!runId || !businessId) {
        throw new Error(
            "runId and businessId are required"
        );
    }

    // 1. Load persisted run.
    const { data: run, error: runError } =
        await supabase
            .from("agent_runs")
            .select(
                "id, business_id, goal_id, status, current_step, checkpoint"
            )
            .eq("id", runId)
            .eq("business_id", businessId)
            .maybeSingle();

    if (runError) throw runError;

    if (!run) {
        throw new Error("Agent run not found");
    }

    // 2. Read saved actions.
    const { data: actions, error: actionsError } =
        await supabase
            .from("agent_actions")
            .select(
                "id, status, action_type, channel, created_at"
            )
            .eq("run_id", runId)
            .eq("business_id", businessId)
            .order("created_at", {
                ascending: true,
            });

    if (actionsError) throw actionsError;

    const results = {
        runId,
        businessId,
        goalId: run.goal_id,

        resumed: true,
        executionMode: "simulation",

        executed: [],
        skipped: [],
        failed: [],

        pendingApproval: 0,
        interrupted: 0,
    };

    // 3. Resume from persisted action states.
    for (const action of actions ?? []) {

        // Completed actions are never repeated.
        if (
            [
                "completed",
                "rejected",
                "cancelled",
                "failed",
            ].includes(action.status)
        ) {
            results.skipped.push({
                actionId: action.id,
                reason: action.status,
            });

            continue;
        }

        // Human decision is still required.
        if (action.status === "pending_approval") {
            results.pendingApproval++;

            results.skipped.push({
                actionId: action.id,
                reason: "Awaiting human approval",
            });

            continue;
        }

        // An interrupted execution requires
        // recovery reconciliation, not another send.
        if (action.status === "executing") {
            results.interrupted++;

            results.skipped.push({
                actionId: action.id,
                reason: "Execution recovery required",
            });

            continue;
        }

        // Only approved simulated messages may execute.
        if (
            action.status !== "approved" ||
            action.action_type !== "send_message" ||
            action.channel !== "simulation"
        ) {
            results.skipped.push({
                actionId: action.id,
                reason: "Action is not executable",
            });

            continue;
        }
        // Validate the approved action's saved message before
        // attempting execution. Invalid records need human review.
        const { data: approvedAction, error: lookupError } =
            await supabase
                .from("agent_actions")
                .select("id, payload")
                .eq("id", action.id)
                .eq("business_id", businessId)
                .eq("status", "approved")
                .maybeSingle();

        if (lookupError) {
            results.failed.push({
                actionId: action.id,
                error: "Unable to verify approved message draft",
            });
            continue;
        }

        if (!approvedAction) {
            results.skipped.push({
                actionId: action.id,
                reason: "Action status changed before execution",
            });
            continue;
        }

        const savedDraft = approvedAction.payload?.messageDraft;

        if (
            typeof savedDraft !== "string" ||
            savedDraft.trim().length < 10 ||
            savedDraft.length > 2000
        ) {
            results.failed.push({
                actionId: action.id,
                error:
                    "Approved action has no valid saved draft. Manual review required.",
            });

            continue;
        }
        try {
            // Existing service checks approval again
            // and atomically claims the action.
            const execution =
                await executeApprovedMessage({
                    actionId: action.id,
                    businessId,
                });

            results.executed.push({
                actionId: action.id,
                deliveryId: execution.deliveryId,
                status: execution.status,
            });

        } catch (error) {
            results.failed.push({
                actionId: action.id,
                error: error.message,
            });
        }
    }

    // 4. Synchronize persisted lifecycle.
    const lifecycle = await syncAgentRunStatus(runId);

    results.lifecycle = lifecycle;

    // 5. Evaluate business goal after resuming the worker.
    // Evaluation must not cause a successful simulated
    // execution to be repeated if measurement fails.

    results.evaluation = null;

    const hasCompletedActions =
        (lifecycle.actionSummary?.completed ?? 0) > 0;

    const hasOutstandingExecution =
        (lifecycle.actionSummary?.approved ?? 0) > 0 ||
        (lifecycle.actionSummary?.executing ?? 0) > 0;

    if (hasCompletedActions && !hasOutstandingExecution) {
        try {
            const evaluation = await evaluateAgentGoal({
                businessId,
                runId,
            });

            results.evaluation = evaluation;
        } catch (error) {
            console.error(
                "Goal evaluation failed:",
                error.message
            );

            results.evaluation = {
                success: false,
                message:
                    "Goal evaluation failed. Saved execution state is preserved.",
            };
        }
    }

    // 5. Determine remaining work.
    if (results.failed.length > 0) {
        results.status = "needs_attention";
    } else if (results.interrupted > 0) {
        results.status = "recovery_required";
    } else if (results.pendingApproval > 0) {
        results.status = "waiting_approval";
    } else {
        results.status = lifecycle.status ??
            run.status;
    }

    // 6. Persist resume event for evaluation.
    const { error: logError } = await supabase
        .from("execution_logs")
        .insert({
            business_id: businessId,
            run_id: runId,
            event_type: "agent_run_resumed",
            severity:
                results.failed.length > 0
                    ? "warning"
                    : "info",
            tool_name: "resume_executor",

            details: {
                executedActionIds:
                    results.executed.map(
                        (item) => item.actionId
                    ),

                skippedActionIds:
                    results.skipped.map(
                        (item) => item.actionId
                    ),

                failedActionIds:
                    results.failed.map(
                        (item) => item.actionId
                    ),

                pendingApproval:
                    results.pendingApproval,

                interrupted:
                    results.interrupted,

                status: results.status,
                executionMode: "simulation",

                // Goal Evaluation Tracking
                evaluationTriggered:
                    results.evaluation !== null,

                evaluationSucceeded:
                    results.evaluation?.success === true,

                evaluationId:
                    results.evaluation?.evaluationId ?? null,

                goalTargetReached:
                    results.evaluation?.targetReached ?? null,

                resumedAt: new Date().toISOString(),
            },

        });

    if (logError) {
        console.error(
            "Resume audit log failed:",
            logError.message
        );
    }

    results.auditLogged = !logError;
    results.completedAt = new Date().toISOString();

    return results;
}
