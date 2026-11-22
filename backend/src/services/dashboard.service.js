
import { supabase } from "../config/supabase.js";
import { getBusinessAnalytics } from "./analytics.service.js";
import { getCustomerRetention } from "./retention.service.js";

/**
 * GrowPilot AI — Dashboard Service
 *
 * Responsibilities:
 * - Business performance overview
 * - Customer retention metrics
 * - Agent execution statistics
 * - Approval workflow statistics
 * - Latest execution activity
 * - Latest evaluation summary
 *
 * Uses existing Supabase tables and services.
 *
 * Note: This dashboard provides current operational
 * metrics. It does not claim AI-generated revenue growth.
 */

async function countRecords(table, businessId, status = null) {
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);

  if (status !== null) {
    query = query.eq("status", status);
  }

  const { count, error } = await query;

  if (error) throw error;

  return count ?? 0;
}

/**
 * Get complete business dashboard summary.
 */
export async function getDashboardSummary(businessId) {
  // 1. Fetch business analytics and retention data
  const [analytics, retention] = await Promise.all([
    getBusinessAnalytics(businessId),
    getCustomerRetention(businessId),
  ]);

  // 2. Fetch agent and action status counts
  const [
    totalAgentRuns,
    totalActionPlans,
    pendingApprovals,
    approvedActions,
    completedActions,
    rejectedActions,
    failedActions,
    executingActions,
  ] = await Promise.all([
    countRecords("agent_runs", businessId),
    countRecords("action_plans", businessId),
    countRecords("agent_actions", businessId, "pending_approval"),
    countRecords("agent_actions", businessId, "approved"),
    countRecords("agent_actions", businessId, "completed"),
    countRecords("agent_actions", businessId, "rejected"),
    countRecords("agent_actions", businessId, "failed"),
    countRecords("agent_actions", businessId, "executing"),
  ]);

  // 3. Fetch recent agent runs

const { data: recentRuns, error: runsError } =
  await supabase
    .from("agent_runs")
    .select(`
      id,
      goal_id,
      status,
      current_step,
      started_at
    `)
    .eq("business_id", businessId)
    .order("started_at", { ascending: false })
    .limit(5);


  if (runsError) throw runsError;

  // 4. Fetch latest execution events
  const { data: recentActivity, error: activityError } =
    await supabase
      .from("execution_logs")
      .select(`
        id,
        run_id,
        action_id,
        event_type,
        severity,
        tool_name,
        created_at
      `)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(10);

  if (activityError) throw activityError;

  // 5. Fetch latest evaluation
  const { data: latestEvaluation, error: evaluationError } =
    await supabase
      .from("evaluation_results")
      .select(`
        id,
        run_id,
        status,
        metric_name,
        actual_value,
        findings,
        recommendations,
        evaluated_at
      `)
      .eq("business_id", businessId)
      .order("evaluated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (evaluationError) throw evaluationError;

  // 6. Calculate dashboard insights
  const totalCustomers = retention.summary.totalCustomers;
  const atRiskCustomers = retention.summary.atRisk;

  const atRiskPercentage = totalCustomers > 0
    ? Number(
        ((atRiskCustomers / totalCustomers) * 100).toFixed(2)
      )
    : 0;

  const totalActions =
    pendingApprovals +
    approvedActions +
    completedActions +
    rejectedActions +
    failedActions +
    executingActions;

  const actionCompletionRate = totalActions > 0
    ? Number(
        ((completedActions / totalActions) * 100).toFixed(2)
      )
    : 0;

  // 7. Return frontend-ready data
  return {
    business: analytics.business,

    businessMetrics: {
      ...analytics.summary,
    },

    retentionMetrics: {
      ...retention.summary,
      atRiskPercentage,
    },

    agentMetrics: {
      totalAgentRuns,
      totalActionPlans,
      totalActions,
      pendingApprovals,
      approvedActions,
      completedActions,
      rejectedActions,
      failedActions,
      executingActions,
      actionCompletionRate,
    },

    recentRuns: recentRuns ?? [],
    recentActivity: recentActivity ?? [],
    latestEvaluation: latestEvaluation ?? null,

    generatedAt: new Date().toISOString(),
  };
}
