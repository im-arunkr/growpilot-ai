
import { Router } from "express";
import { getDashboardOverview } from "../controllers/dashboard.controller.js";

const router = Router();

/**
 * GET /api/dashboard/summary
 *
 * Returns:
 * - Business analytics
 * - Customer retention metrics
 * - Agent execution statistics
 * - Pending approvals
 * - Recent execution history
 * - Latest evaluation
 */
router.get("/summary", getDashboardOverview);

export default router;
