
import { z } from "zod";
import { getBusinessAnalytics } from "../services/analytics.service.js";

// Accept valid UUID-format identifiers
const businessIdSchema = z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid business ID format"
);

export async function getAnalytics(req, res, next) {
  try {
    // Validate business ID
    const parsed = businessIdSchema.safeParse(
      req.query.businessId
    );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Valid businessId is required",
      });
    }

    // Fetch analytics from service
    const analytics = await getBusinessAnalytics(parsed.data);

    return res.status(200).json({
      success: true,
      message: "Business analytics fetched successfully",
      data: analytics,
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
