
import { z } from "zod";
import { getDashboardSummary } from "../services/dashboard.service.js";

/**
 * GrowPilot AI — Dashboard Controller
 *
 * Handles business dashboard API requests.
 * Validates input and returns dashboard metrics.
 */

const businessIdSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid business ID format"
);

export async function getDashboardOverview(req, res, next) {
  try {
    const parsed = businessIdSchema.safeParse(
      req.query.businessId
    );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Valid businessId is required",
      });
    }

    const dashboard = await getDashboardSummary(parsed.data);

    return res.status(200).json({
      success: true,
      message: "Dashboard overview fetched successfully",
      data: dashboard,
    });

  } catch (error) {
    if (error.message === "Business not found") {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    next(error);
  }
}
