
import { z } from "zod";

import { resumeAgentRun } from "../services/agentResume.service.js";

const uuidSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid UUID format"
);

const requestSchema = z.object({
  businessId: uuidSchema,
}).strict();

export async function resumeAgentExecution(req, res, next) {
  try {
    const runId = uuidSchema.safeParse(req.params.runId);
    const body = requestSchema.safeParse(req.body);

    if (!runId.success || !body.success) {
      return res.status(400).json({
        success: false,
        message: "Valid runId and businessId are required",
        details: {
          runIdValid: runId.success,
          bodyValid: body.success,
          bodyErrors: body.success
            ? undefined
            : z.treeifyError(body.error),
        },
      });
    }

    if (!req.user?.id || !req.business?.id) {
      return res.status(403).json({
        success: false,
        message: "Business authorization required",
      });
    }

    if (
      body.data.businessId.toLowerCase() !==
      req.business.id.toLowerCase()
    ) {
      return res.status(403).json({
        success: false,
        message: "Business mismatch",
      });
    }

    if (!["owner", "admin"].includes(req.business.role)) {
      return res.status(403).json({
        success: false,
        message: "Owner or Admin permission is required",
      });
    }

    const result = await resumeAgentRun({
      runId: runId.data,
      businessId: req.business.id,
    });

    return res.status(200).json({
      success: true,
      message: "AI Worker resume processed",
      data: result,
    });

  } catch (error) {
    if (error.message === "Agent run not found") {
      return res.status(404).json({
        success: false,
        message: "Agent run not found",
      });
    }

    next(error);
  }
}
