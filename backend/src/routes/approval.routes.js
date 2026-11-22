
import { Router } from "express";


import {
  listPendingApprovals,
  listExecutionHistory,
  listApprovedActions,
  getApprovalDetails,
  updateApprovalDecision,
  executeApprovedAction,
  recoverAgentAction,
} from "../controllers/approval.controller.js";

const router = Router();


// Pending approvals
router.get("/", listPendingApprovals);

// Approved actions awaiting execution
router.get("/approved", listApprovedActions);

// Completed simulation history
router.get("/history", listExecutionHistory);

// Individual action details
router.get("/:actionId", getApprovalDetails);

// Approve or reject
router.patch("/:actionId/decision", updateApprovalDecision);

// Execute simulation
router.post("/:actionId/execute", executeApprovedAction);

// Recover stuck action
router.post("/:actionId/recover", recoverAgentAction);

export default router;
