
import { Router } from "express";

import { getDashboardOverview } from "../controllers/dashboard.controller.js";

import { requireBusinessAccess } from "../middleware/requireBusinessAccess.js";

const router = Router();

/**
 * GET /api/dashboard/summary?businessId=<uuid>
 *
 * Authentication:
 * requireAuth is applied globally in app.js.
 *
 * Authorization:
 * requireBusinessAccess checks that the
 * authenticated user has an active membership
 * for the requested business.
 *
 * Returns:
 * - Business analytics
 * - Customer retention metrics
 * - Agent execution statistics
 * - Pending approvals
 * - Recent execution history
 * - Latest evaluation
 */
router.get(
  "/summary",
  requireBusinessAccess,
  getDashboardOverview
);

export default router;
