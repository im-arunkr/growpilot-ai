
import { Router } from "express";

import {
  listCustomers,
  getCustomer,
  listCustomerTransactions,
  getRetentionAnalysis
} from "../controllers/customer.controller.js";

const router = Router();

router.get("/", listCustomers);
router.get("/:id/transactions", listCustomerTransactions);
router.get("/:id", getCustomer);
// Customer retention analysis
router.get("/retention/analysis", getRetentionAnalysis);
export default router;
