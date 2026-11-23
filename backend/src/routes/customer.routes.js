
import { Router } from "express";

import {
  listCustomers,
  getCustomer,
  listCustomerTransactions,
  getRetentionAnalysis,
} from "../controllers/customer.controller.js";

import { requireBusinessAccess } from "../middleware/requireBusinessAccess.js";

const router = Router();

/**
 * Authentication:
 * Already applied in app.js via requireAuth.
 *
 * Authorization:
 * Every customer endpoint requires an active
 * business membership.
 *
 * Expected query:
 * ?businessId=<uuid>
 */

// List customers with search, filters and pagination.
router.get(
  "/",
  requireBusinessAccess,
  listCustomers
);

// Customer retention analysis.
// IMPORTANT: Static route must precede /:id.
router.get(
  "/retention/analysis",
  requireBusinessAccess,
  getRetentionAnalysis
);

// Customer transaction history.
router.get(
  "/:id/transactions",
  requireBusinessAccess,
  listCustomerTransactions
);

// Individual customer details.
router.get(
  "/:id",
  requireBusinessAccess,
  getCustomer
);

export default router;
