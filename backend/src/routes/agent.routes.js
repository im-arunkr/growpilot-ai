
import { Router } from "express";

import {
    executeAgent,
    listAgentTools,
    getExecutionHistory,
    getAgentEvaluation,
    persistAgentEvaluation,
      checkAIModelStatus,
      generateBusinessInsights,
      generateRetentionStrategy,
      generateCustomerMessageDraft,
} from "../controllers/agent.controller.js";

const router = Router();

// Get registered agent tools
router.get("/tools", listAgentTools);

// Execute agent workflow
router.post("/run", executeAgent);

// Fetch saved agent execution history
router.get("/history", getExecutionHistory);

// Evaluate agent execution performance
router.get("/:runId/evaluation", getAgentEvaluation);

// Save or update agent evaluation
router.post("/:runId/evaluation", persistAgentEvaluation);

// Check Ollama AI model availability
router.get("/models/status", checkAIModelStatus);

// Generate AI-powered business insights
router.post("/insights", generateBusinessInsights);

// AI-powered customer retention strategy
router.post("/retention-strategy", generateRetentionStrategy);
// Generate AI-powered customer message draft
router.post("/message-draft", generateCustomerMessageDraft);
export default router;
