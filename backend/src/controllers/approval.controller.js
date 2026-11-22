
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

const uuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid UUID format"
);

const decisionSchema = z.object({
  businessId: uuidSchema,
  decision: z.enum(["approved", "rejected"]),
  approvedBy: z.string().trim().min(1).max(100),
  reason: z.string().trim().max(500).nullable().optional(),
}).strict().superRefine((data, ctx) => {
  if (data.decision === "rejected" && !data.reason) {
    ctx.addIssue({
      code: "custom",
      path: ["reason"],
      message: "Rejection reason is required",
    });
  }
});

// GET /api/approvals?businessId=...
export async function listPendingApprovals(req, res, next) {
  try {
    const parsed = uuidSchema.safeParse(req.query.businessId);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Valid businessId is required",
      });
    }

    const result = await getPendingApprovals(parsed.data);

    return res.status(200).json({
      success: true,
      message: "Pending approvals fetched successfully",
      data: result.actions,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
}

// GET /api/approvals/:actionId?businessId=...
export async function getApprovalDetails(req, res, next) {
  try {
    const actionId = uuidSchema.safeParse(req.params.actionId);
    const businessId = uuidSchema.safeParse(req.query.businessId);

    if (!actionId.success || !businessId.success) {
      return res.status(400).json({
        success: false,
        message: "Valid actionId and businessId are required",
      });
    }

    const action = await getApprovalById(
      actionId.data,
      businessId.data
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

// PATCH /api/approvals/:actionId/decision
export async function updateApprovalDecision(req, res, next) {
  try {
    const actionId = uuidSchema.safeParse(req.params.actionId);
    const body = decisionSchema.safeParse(req.body);

    if (!actionId.success || !body.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid approval request",
        errors: body.success
          ? undefined
          : z.treeifyError(body.error),
      });
    }

    const result = await decideApproval({
      actionId: actionId.data,
      ...body.data,
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
      error.message.startsWith("Action already processed") ||
      error.message.includes("already processed by another")
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

/**
 * Execute Approved Customer Message
 *
 * POST /api/approvals/:actionId/execute
 *
 * Only approved actions can be executed.
 * Messages are simulated, never actually sent.
 */

export async function executeApprovedAction(req, res, next) {
  try {
    // Validate action ID
    const actionId = uuidSchema.safeParse(
      req.params.actionId
    );

    // Validate business ID
    const bodySchema = z.object({
      businessId: uuidSchema,
    }).strict();

    const body = bodySchema.safeParse(req.body);

    if (!actionId.success || !body.success) {
      return res.status(400).json({
        success: false,
        message: "Valid actionId and businessId are required",
      });
    }

    // Execute simulated message
    const result = await executeApprovedMessage({
      actionId: actionId.data,
      businessId: body.data.businessId,
    });

    return res.status(200).json({
      success: true,
      message: "Approved action executed successfully",
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
      error.message.startsWith("Action cannot execute") ||
      error.message === "Human approval is required" ||
      error.message.includes("already claimed")
    ) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    if (
      error.message === "Only simulated messages are supported"
    ) {
      return res.status(403).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

/**
 * Recover Stuck Agent Action
 *
 * POST /api/approvals/:actionId/recover
 *
 * Reconciles stale execution state without
 * sending duplicate customer messages.
 */
export async function recoverAgentAction(req, res, next) {
  try {
    const actionId = uuidSchema.safeParse(
      req.params.actionId
    );

    const bodySchema = z.object({
      businessId: uuidSchema,
      staleMinutes: z.number()
        .int()
        .min(5)
        .max(1440)
        .default(5),
    }).strict();

    const body = bodySchema.safeParse(req.body);

    if (!actionId.success || !body.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid action recovery request",
        errors: body.success
          ? undefined
          : z.treeifyError(body.error),
      });
    }

    const result = await recoverStuckAction({
      actionId: actionId.data,
      businessId: body.data.businessId,
      staleMinutes: body.data.staleMinutes,
    });

    return res.status(result.success ? 200 : 409).json({
      ...result,
    });

  } catch (error) {
    if (error.message === "Action not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    if (error.message.startsWith("Action is not recoverable")) {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

/**
 * Get completed simulated execution history.
 *
 * GET /api/approvals/history?businessId=...
 *
 * Read-only. No customer messages are sent.
 */
export async function listExecutionHistory(req, res, next) {
  try {
    const parsed = uuidSchema.safeParse(req.query.businessId);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Valid businessId is required",
      });
    }

    const result = await getExecutionHistory(parsed.data);

    return res.status(200).json({
      success: true,
      message: "Execution history fetched successfully",
      data: result.actions,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Fetch approved actions awaiting simulation.
 *
 * GET /api/approvals/approved?businessId=...
 *
 * Read-only. Does not execute any messages.
 */
export async function listApprovedActions(req, res, next) {
  try {
    const parsed = uuidSchema.safeParse(
      req.query.businessId
    );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Valid businessId is required",
      });
    }

    const result = await getApprovedActions(parsed.data);

    return res.status(200).json({
      success: true,
      message: "Approved actions fetched successfully",
      data: result.actions,
      total: result.total,
    });
  } catch (error) {
    next(error);
  }
}
