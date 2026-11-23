
import { z } from "zod";

import { evaluateAgentGoal } from "../services/goalEvaluation.service.js";

const uuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
);

/**
 * POST /api/agent/:runId/goal-evaluation
 *
 * Authentication, business membership and
 * run ownership are enforced by route middleware.
 */
export async function evaluateWorkerGoal(req, res, next) {
  try {
    const parsedRunId = uuidSchema.safeParse(
      req.params.runId
    );

    if (!parsedRunId.success) {
      return res.status(400).json({
        success: false,
        message: "Valid runId is required",
      });
    }

    if (
      !req.user?.id ||
      !req.business?.id ||
      req.agentRun?.id !== parsedRunId.data
    ) {
      return res.status(403).json({
        success: false,
        message: "Run authorization required",
      });
    }

    if (
      !["owner", "admin"].includes(req.business.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Owner or Admin permission required",
      });
    }

    const evaluation = await evaluateAgentGoal({
      businessId: req.business.id,
      runId: parsedRunId.data,
    });

    return res.status(200).json({
      success: true,
      message: "Business goal evaluated successfully",
      data: evaluation,
    });
  } catch (error) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}
