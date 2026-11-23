
import { z } from "zod";

import { executeApprovedMessage } from "../tools/sendMessage.js";
import { recoverStuckAction } from "../utils/retry.js";

import {
  getPendingApprovals,
  getApprovalById,
  decideApproval,
  getExecutionHistory,
  getApprovedActions,
} from "../services/approval.service.js";

// ======================================================
// 1. VALIDATION SCHEMAS
// ======================================================

const uuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid UUID format"
);

const decisionSchema = z
  .object({
    businessId: uuidSchema,

    decision: z.enum([
      "approved",
      "rejected",
    ]),

    // Accepted for backward compatibility.
    // Never trusted as the actual approver.
    approvedBy: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .optional(),

    reason: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.decision === "rejected" &&
      !data.reason
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "Rejection reason is required",
      });
    }
  });

const executeSchema = z
  .object({
    businessId: uuidSchema,
  })
  .strict();

const recoverySchema = z
  .object({
    businessId: uuidSchema,

    staleMinutes: z
      .number()
      .int()
      .min(5)
      .max(1440)
      .default(5),
  })
  .strict();

// ======================================================
// 2. AUTHORIZATION HELPERS
// ======================================================

/**
 * requireAuth runs in app.js.
 *
 * requireBusinessAccess or requireApprovalActionAccess
 * runs in approval.routes.js.
 *
 * Never trust businessId directly from user input.
 */
function getAuthorizedBusinessId(req) {
  if (!req.user?.id || !req.business?.id) {
    return null;
  }

  return req.business.id;
}

/**
 * Ensure the user can perform sensitive actions.
 *
 * Staff may view authorized business records,
 * but cannot approve, execute, or recover actions.
 */
function canManageApprovals(req) {
  return (
    req.business?.role === "owner" ||
    req.business?.role === "admin"
  );
}

/**
 * Verify the supplied ID matches the business
 * already authorized by middleware.
 */
function matchesAuthorizedBusiness(
  businessId,
  authorizedBusinessId
) {
  return (
    typeof businessId === "string" &&
    typeof authorizedBusinessId === "string" &&
    businessId.toLowerCase() ===
      authorizedBusinessId.toLowerCase()
  );
}

/**
 * Ensure the route has already verified
 * ownership of the requested action.
 */
function hasAuthorizedAction(req, actionId) {
  const action = req.approvalAction;

  return (
    action?.id?.toLowerCase() ===
      actionId.toLowerCase() &&
    matchesAuthorizedBusiness(
      action?.business_id,
      req.business?.id
    )
  );
}

/**
 * Use the authenticated user identity.
 * Do not trust client-submitted approvedBy.
 */
function getVerifiedApprover(req) {
  const email = req.user?.email;

  if (
    typeof email === "string" &&
    email.trim()
  ) {
    return email.trim();
  }

  return req.user.id;
}

function authorizationError(res) {
  return res.status(403).json({
    success: false,
    message: "Business authorization required",
  });
}

function permissionError(res) {
  return res.status(403).json({
    success: false,
    message:
      "Owner or Admin permission is required",
  });
}

// ======================================================
// 3. LIST PENDING APPROVALS
// ======================================================

/**
 * GET /api/approvals?businessId=<uuid>
 *
 * Read-only.
 */
export async function listPendingApprovals(
  req,
  res,
  next
) {
  try {
    const businessId =
      getAuthorizedBusinessId(req);

    if (!businessId) {
      return authorizationError(res);
    }

    const parsed = uuidSchema.safeParse(
      req.query.businessId
    );

    if (
      !parsed.success ||
      !matchesAuthorizedBusiness(
        parsed.data,
        businessId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid businessId",
      });
    }

    const result = await getPendingApprovals(
      businessId
    );

    return res.status(200).json({
      success: true,
      message:
        "Pending approvals fetched successfully",
      data: result.actions,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
}

// ======================================================
// 4. GET INDIVIDUAL APPROVAL DETAILS
// ======================================================

/**
 * GET /api/approvals/:actionId
 *
 * Route middleware verifies action ownership.
 */
export async function getApprovalDetails(
  req,
  res,
  next
) {
  try {
    const businessId =
      getAuthorizedBusinessId(req);

    if (!businessId) {
      return authorizationError(res);
    }

    const actionId = uuidSchema.safeParse(
      req.params.actionId
    );

    if (!actionId.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid actionId",
      });
    }

    if (!hasAuthorizedAction(req, actionId.data)) {
      return res.status(404).json({
        success: false,
        message: "Approval action not found",
      });
    }

    const action = await getApprovalById(
      actionId.data,
      businessId
    );

    if (!action) {
      return res.status(404).json({
        success: false,
        message: "Approval action not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: action,
    });
  } catch (error) {
    next(error);
  }
}

// ======================================================
// 5. APPROVE OR REJECT ACTION
// ======================================================

/**
 * PATCH /api/approvals/:actionId/decision
 *
 * Owner/Admin only.
 */
export async function updateApprovalDecision(
  req,
  res,
  next
) {
  try {
    const businessId =
      getAuthorizedBusinessId(req);

    if (!businessId) {
      return authorizationError(res);
    }

    if (!canManageApprovals(req)) {
      return permissionError(res);
    }

    const actionId = uuidSchema.safeParse(
      req.params.actionId
    );

    const body = decisionSchema.safeParse(
      req.body
    );

    if (!actionId.success || !body.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid approval request",
        errors: body.success
          ? undefined
          : z.treeifyError(body.error),
      });
    }

    if (
      !matchesAuthorizedBusiness(
        body.data.businessId,
        businessId
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this business",
      });
    }

    if (!hasAuthorizedAction(req, actionId.data)) {
      return res.status(404).json({
        success: false,
        message: "Action not found",
      });
    }

    const result = await decideApproval({
      actionId: actionId.data,
      businessId,

      decision: body.data.decision,

      // Verified identity, not frontend text.
      approvedBy: getVerifiedApprover(req),

      reason: body.data.reason,
    });

    return res.status(200).json(result);
  } catch (error) {
    if (error.message === "Action not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message.startsWith(
        "Action already processed"
      ) ||
      error.message.includes(
        "already processed by another"
      )
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

// ======================================================
// 6. EXECUTE APPROVED ACTION
// ======================================================

/**
 * POST /api/approvals/:actionId/execute
 *
 * Owner/Admin only.
 *
 * Existing sendMessage tool must continue
 * enforcing simulation-only execution.
 */
export async function executeApprovedAction(
  req,
  res,
  next
) {
  try {
    const businessId =
      getAuthorizedBusinessId(req);

    if (!businessId) {
      return authorizationError(res);
    }

    if (!canManageApprovals(req)) {
      return permissionError(res);
    }

    const actionId = uuidSchema.safeParse(
      req.params.actionId
    );

    const body = executeSchema.safeParse(
      req.body
    );

    if (!actionId.success || !body.success) {
      return res.status(400).json({
        success: false,
        message:
          "Valid actionId and businessId are required",
      });
    }

    if (
      !matchesAuthorizedBusiness(
        body.data.businessId,
        businessId
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this business",
      });
    }

    if (!hasAuthorizedAction(req, actionId.data)) {
      return res.status(404).json({
        success: false,
        message: "Action not found",
      });
    }

    const result = await executeApprovedMessage({
      actionId: actionId.data,
      businessId,
    });

    return res.status(200).json({
      success: true,
      message:
        "Approved action executed successfully",
      data: result,
    });
  } catch (error) {
    if (error.message === "Action not found") {
      return res.status(404).json({
        success: false,
        message: "Action not found",
      });
    }

    if (
      error.message.startsWith(
        "Action cannot execute"
      ) ||
      error.message ===
        "Human approval is required" ||
      error.message.includes("already claimed")
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message ===
      "Only simulated messages are supported"
    ) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

// ======================================================
// 7. RECOVER STUCK ACTION
// ======================================================

/**
 * POST /api/approvals/:actionId/recover
 *
 * Owner/Admin only.
 */
export async function recoverAgentAction(
  req,
  res,
  next
) {
  try {
    const businessId =
      getAuthorizedBusinessId(req);

    if (!businessId) {
      return authorizationError(res);
    }

    if (!canManageApprovals(req)) {
      return permissionError(res);
    }

    const actionId = uuidSchema.safeParse(
      req.params.actionId
    );

    const body = recoverySchema.safeParse(
      req.body
    );

    if (!actionId.success || !body.success) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid action recovery request",
        errors: body.success
          ? undefined
          : z.treeifyError(body.error),
      });
    }

    if (
      !matchesAuthorizedBusiness(
        body.data.businessId,
        businessId
      )
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this business",
      });
    }

    if (!hasAuthorizedAction(req, actionId.data)) {
      return res.status(404).json({
        success: false,
        message: "Action not found",
      });
    }

    const result = await recoverStuckAction({
      actionId: actionId.data,
      businessId,
      staleMinutes: body.data.staleMinutes,
    });

    return res.status(
      result.success ? 200 : 409
    ).json({
      ...result,
    });
  } catch (error) {
    if (error.message === "Action not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message.startsWith(
        "Action is not recoverable"
      )
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

// ======================================================
// 8. SIMULATED EXECUTION HISTORY
// ======================================================

/**
 * GET /api/approvals/history
 *
 * Read-only.
 */
export async function listExecutionHistory(
  req,
  res,
  next
) {
  try {
    const businessId =
      getAuthorizedBusinessId(req);

    if (!businessId) {
      return authorizationError(res);
    }

    const parsed = uuidSchema.safeParse(
      req.query.businessId
    );

    if (
      !parsed.success ||
      !matchesAuthorizedBusiness(
        parsed.data,
        businessId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid businessId",
      });
    }

    const result = await getExecutionHistory(
      businessId
    );

    return res.status(200).json({
      success: true,
      message:
        "Execution history fetched successfully",
      data: result.actions,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
}

// ======================================================
// 9. APPROVED ACTIONS
// ======================================================

/**
 * GET /api/approvals/approved
 *
 * Read-only.
 */
export async function listApprovedActions(
  req,
  res,
  next
) {
  try {
    const businessId =
      getAuthorizedBusinessId(req);

    if (!businessId) {
      return authorizationError(res);
    }

    const parsed = uuidSchema.safeParse(
      req.query.businessId
    );

    if (
      !parsed.success ||
      !matchesAuthorizedBusiness(
        parsed.data,
        businessId
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid businessId",
      });
    }

    const result = await getApprovedActions(
      businessId
    );

    return res.status(200).json({
      success: true,
      message:
        "Approved actions fetched successfully",
      data: result.actions,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
}
