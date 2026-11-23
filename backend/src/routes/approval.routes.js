
import { Router } from "express";

import { supabase } from "../config/supabase.js";

import { requireBusinessAccess } from "../middleware/requireBusinessAccess.js";

import {
  listPendingApprovals,
  listExecutionHistory,
  listApprovedActions,
  getApprovalDetails,
  updateApprovalDecision,
  executeApprovedAction,
  recoverAgentAction,
} from "../controllers/approval.controller.js";

const router = Router();

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GrowPilot AI — Approval Action Authorization
 *
 * requireAuth is already applied in app.js.
 *
 * For action-specific routes:
 * 1. Validate actionId.
 * 2. Find the action's business.
 * 3. Verify active business membership.
 * 4. Reject any conflicting supplied businessId.
 * 5. Attach the authorized business to req.
 *
 * All database access uses the backend service-role
 * client, so explicit ownership checks are essential.
 */
async function requireApprovalActionAccess(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const actionId = req.params.actionId;

    if (
      typeof actionId !== "string" ||
      !UUID_REGEX.test(actionId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid actionId is required",
      });
    }

    // Find which business owns this action.
    const { data: action, error: actionError } =
      await supabase
        .from("agent_actions")
        .select("id, business_id, status")
        .eq("id", actionId)
        .maybeSingle();

    if (actionError) {
      return next(actionError);
    }

    if (!action) {
      return res.status(404).json({
        success: false,
        message: "Action not found",
      });
    }

    // Check that supplied businessId matches the
    // actual owner of the action.
    const suppliedBusinessIds = [
      req.query?.businessId,
      req.body?.businessId,
    ].filter((value) => value !== undefined);

    if (
      suppliedBusinessIds.some(
        (value) =>
          typeof value !== "string" ||
          !UUID_REGEX.test(value)
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid businessId",
      });
    }

    if (
      suppliedBusinessIds.some(
        (value) =>
          value.toLowerCase() !==
          action.business_id.toLowerCase()
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this action",
      });
    }

    // Check active membership for the business
    // which actually owns this action.
    const { data: membership, error: membershipError } =
      await supabase
        .from("business_memberships")
        .select("business_id, role, status")
        .eq("user_id", req.user.id)
        .eq("business_id", action.business_id)
        .eq("status", "active")
        .maybeSingle();

    if (membershipError) {
      return next(membershipError);
    }

    if (!membership) {
      // Avoid disclosing another business's action.
      return res.status(404).json({
        success: false,
        message: "Action not found",
      });
    }

    req.business = {
      id: membership.business_id,
      role: membership.role,
    };

    req.approvalAction = {
      id: action.id,
      business_id: action.business_id,
      status: action.status,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

// ======================================================
// 1. BUSINESS-SCOPED APPROVAL LISTS
// ======================================================

/**
 * GET /api/approvals?businessId=<uuid>
 *
 * Get pending actions for an authorized business.
 */
router.get(
  "/",
  requireBusinessAccess,
  listPendingApprovals
);

/**
 * GET /api/approvals/approved?businessId=<uuid>
 *
 * Get approved actions awaiting execution.
 */
router.get(
  "/approved",
  requireBusinessAccess,
  listApprovedActions
);

/**
 * GET /api/approvals/history?businessId=<uuid>
 *
 * Get simulated execution history.
 */
router.get(
  "/history",
  requireBusinessAccess,
  listExecutionHistory
);

// ======================================================
// 2. INDIVIDUAL ACTION ROUTES
// ======================================================

/**
 * GET /api/approvals/:actionId
 *
 * Read an action only if the user belongs to
 * the business that owns the action.
 */
router.get(
  "/:actionId",
  requireApprovalActionAccess,
  getApprovalDetails
);

/**
 * PATCH /api/approvals/:actionId/decision
 *
 * Approve or reject an authorized action.
 *
 * Controller must continue to validate action
 * status and approval rules.
 */
router.patch(
  "/:actionId/decision",
  requireApprovalActionAccess,
  updateApprovalDecision
);

/**
 * POST /api/approvals/:actionId/execute
 *
 * Execute an authorized action in simulation mode.
 *
 * Controller must enforce approval status and
 * simulation-only execution.
 */
router.post(
  "/:actionId/execute",
  requireApprovalActionAccess,
  executeApprovedAction
);

/**
 * POST /api/approvals/:actionId/recover
 *
 * Recover an authorized action.
 *
 * Role-based recovery permissions should be
 * added before production use.
 */
router.post(
  "/:actionId/recover",
  requireApprovalActionAccess,
  recoverAgentAction
);

export default router;
