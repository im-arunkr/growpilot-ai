
import { supabase } from "../config/supabase.js";
import { z } from "zod";
/**
 * GET /api/agent/goals/active
 *
 * Returns the active customer retention goal
 * for the authenticated business.
 */
export async function getActiveBusinessGoal(req, res, next) {
  try {
    const businessId = req.business?.id;

    if (!businessId) {
      return res.status(403).json({
        success: false,
        message: "Business authorization required",
      });
    }

    const { data: goal, error } = await supabase
      .from("agent_goals")
      .select(`
        id,
        business_id,
        title,
        description,
        goal_type,
        target_metric,
        baseline_value,
        target_value,
        due_at,
        status,
        created_at,
        updated_at
      `)
      .eq("business_id", businessId)
      .eq("goal_type", "customer_retention")
      .eq("status", "active")
      .maybeSingle();

    if (error) throw error;

    return res.status(200).json({
      success: true,
      message: goal
        ? "Active business goal retrieved"
        : "No active customer retention goal found",
      data: goal,
    });
  } catch (error) {
    next(error);
  }
}


const saveGoalSchema = z.object({
  
businessId: z.string().regex(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  "Invalid business ID format"
),

  title: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(1000),
  baseline: z.number().min(0).max(100),
  target: z.number().min(0).max(100),
  dueAt: z.string().datetime({ offset: true }).nullable()
}).strict().refine(
  (data) => data.target > data.baseline,
  {
    message: "Target must be greater than baseline",
    path: ["target"]
  }
);

export async function saveBusinessGoal(req, res, next) {
  try {
    // Only authorized owners/admins may modify goals.
    const role = String(
      req.business?.role ?? ""
    ).toLowerCase();

    if (!["owner", "admin"].includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Only business owners or admins can modify goals"
      });
    }

    const parsed = saveGoalSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid goal configuration",
        errors: parsed.error.flatten()
      });
    }

    const input = parsed.data;

    if (input.businessId !== req.business.id) {
      return res.status(403).json({
        success: false,
        message: "Business ID mismatch"
      });
    }

    if (
      input.dueAt &&
      new Date(input.dueAt).getTime() <= Date.now()
    ) {
      return res.status(400).json({
        success: false,
        message: "Deadline must be in the future"
      });
    }

    const { data, error } = await supabase.rpc(
      "save_business_goal",
      {
        p_business_id: input.businessId,
        p_title: input.title,
        p_description: input.description,
        p_baseline: input.baseline,
        p_target: input.target,
        p_due_at: input.dueAt
      }
    );

    if (error) throw error;

    return res.status(201).json({
      success: true,
      message: "Business goal saved successfully",
      data
    });

  } catch (error) {
    next(error);
  }
}
