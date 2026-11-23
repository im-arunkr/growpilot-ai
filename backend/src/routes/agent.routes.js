
import { Router } from "express";

import { supabase } from "../config/supabase.js";
import { evaluateWorkerGoal } from "../controllers/goalEvaluation.controller.js";
import { requireBusinessAccess } from "../middleware/requireBusinessAccess.js";
import { resumeAgentExecution } from "../controllers/agentResume.controller.js";
import {
  executeAgent,
  listAgentTools,
  getExecutionHistory,
  getAgentEvaluation,
  persistAgentEvaluation,
  checkAIModelStatus,
  generateBusinessInsights,
  generateRetentionStrategy,
  generateCustomerMessageDraft,
} from "../controllers/agent.controller.js";

const router = Router();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Verify that a requested agent run belongs to
 * the already-authorized business.
 *
 * Must run AFTER requireBusinessAccess.
 *
 * The route requires businessId in the query
 * or request body.
 */
async function requireAgentRunAccess(req, res, next) {
  try {
    const businessId = req.business?.id;
    const runId = req.params.runId;

    if (!businessId) {
      return res.status(403).json({
        success: false,
        message: "Business authorization required",
      });
    }

    if (
      typeof runId !== "string" ||
      !UUID_REGEX.test(runId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid runId is required",
      });
    }

    const { data: run, error } = await supabase
      .from("agent_runs")
      .select("id, business_id")
      .eq("id", runId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) {
      return next(error);
    }

    if (!run) {
      return res.status(404).json({
        success: false,
        message: "Agent run not found",
      });
    }

    req.agentRun = run;

    return next();
  } catch (error) {
    return next(error);
  }
}

// ======================================================
// 1. AGENT INFORMATION
// ======================================================

// Authenticated users can see registered agent tools.
router.get(
  "/tools",
  listAgentTools
);

// Authenticated users can check model availability.
router.get(
  "/models/status",
  checkAIModelStatus
);

// ======================================================
// 2. BUSINESS-AUTHORIZED AGENT WORKFLOWS
// ======================================================

// Run AI agent.
// Requires businessId in request body.
router.post(
  "/run",
  requireBusinessAccess,
  executeAgent
);

// Fetch agent execution history.
// Requires businessId in query.
router.get(
  "/history",
  requireBusinessAccess,
  getExecutionHistory
);

// Generate business insights.
// Requires businessId in request body.
router.post(
  "/insights",
  requireBusinessAccess,
  generateBusinessInsights
);

// Generate retention strategy.
// Requires businessId in request body.
router.post(
  "/retention-strategy",
  requireBusinessAccess,
  generateRetentionStrategy
);

// Generate customer message draft.
// Requires businessId in request body.
//
// Additional action/customer ownership checks
// must be verified inside the controller/service.
router.post(
  "/message-draft",
  requireBusinessAccess,
  generateCustomerMessageDraft
);

// ======================================================
// 3. AGENT RUN EVALUATION
// ======================================================

// Read evaluation for an authorized agent run.
// Requires businessId in query parameters.
router.get(
  "/:runId/evaluation",
  requireBusinessAccess,
  requireAgentRunAccess,
  getAgentEvaluation
);

// Save/update evaluation for an authorized run.
// Requires businessId in request body.
// Role-based write permissions are a future enhancement.
router.post(
  "/:runId/evaluation",
  requireBusinessAccess,
  requireAgentRunAccess,
  persistAgentEvaluation
);
// Resume previously saved AI Worker execution.
// requireAuth already runs in app.js.
// requireBusinessAccess validates business membership.
router.post(
  "/:runId/resume",
  requireBusinessAccess,
  resumeAgentExecution
);

// Evaluate a saved worker's measurable business goal.
// Existing middleware verifies business and run ownership.
router.post(
  "/:runId/goal-evaluation",
  requireBusinessAccess,
  requireAgentRunAccess,
  evaluateWorkerGoal
);
export default router;
