
import { Router } from "express";

import { getAnalytics } from "../controllers/analytics.controller.js";
import { requireBusinessAccess } from "../middleware/requireBusinessAccess.js";

const router = Router();

/**
 * GET /api/analytics?businessId=<uuid>
 *
 * Security:
 *
 * 1. requireAuth in app.js verifies Supabase login.
 * 2. requireBusinessAccess verifies active membership.
 * 3. getAnalytics returns authorized business analytics.
 *
 * The controller receives the businessId only after
 * business membership has been verified.
 */
router.get(
  "/",
  requireBusinessAccess,
  getAnalytics
);

export default router;
