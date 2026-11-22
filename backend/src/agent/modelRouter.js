
import {
  checkOllamaAvailability,
  generateOllamaResponse,
} from "../config/aiModels.js";

import {
  SYSTEM_PROMPT,
  buildBusinessAnalysisPrompt,
  buildRetentionStrategyPrompt,
  buildMessagePrompt,
} from "./prompts.js";

/**
 * GrowPilot AI — Model Router
 *
 * Responsibilities:
 * - Route AI tasks to the configured model
 * - Apply task-specific system instructions
 * - Keep customer messages in English
 * - Handle model failures
 * - Track inference latency
 *
 * Provider: Ollama
 * Model: Qwen 2.5 3B
 */

const SUPPORTED_TASKS = [
  "business_analysis",
  "retention_strategy",
  "message_generation",
];

/**
 * Additional instructions for customer message generation.
 */
const MESSAGE_SYSTEM_PROMPT = `
${SYSTEM_PROMPT}

You are writing a customer-facing message draft
for a small Indian digital services business.

CRITICAL LANGUAGE RULES:

1. Generate customer messages in ENGLISH ONLY.
2. Use simple, natural and professional English.
3. Never write Hindi, Hinglish or Devanagari text.
4. Never translate the response into Hindi.
5. Use the verified customer and business names.
6. Never invent business services or promotional offers.
7. Never invent facts about customer accounts.
8. Never claim a message was delivered or sent.
9. All messages require human approval.
10. Execution mode must always be simulation.

Return ONLY valid JSON in English.

Required JSON structure:

{
  "message": "A simple professional English message",
  "requiresApproval": true,
  "executionMode": "simulation"
}
`;

/**
 * Check Ollama availability.
 */
export async function getModelStatus() {
  return checkOllamaAvailability();
}

/**
 * Route an AI task to the appropriate model.
 */
export async function routeAIRequest({ task, data }) {
  if (!SUPPORTED_TASKS.includes(task)) {
    throw new Error(`Unsupported AI task: ${task}`);
  }

  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    throw new Error("Valid AI task data is required");
  }

  let userPrompt;
  let systemPrompt = SYSTEM_PROMPT;
  let temperature = 0.3;

  switch (task) {
    case "business_analysis": {
      userPrompt = buildBusinessAnalysisPrompt(data);
      break;
    }

    case "retention_strategy": {
      userPrompt = buildRetentionStrategyPrompt(data);
      temperature = 0.2;
      break;
    }

   
case "message_generation": {
  userPrompt = buildMessagePrompt(data);

  // Enforce English-only and simulation-only messages.
  systemPrompt = MESSAGE_SYSTEM_PROMPT;

  // Use controlled variation during regeneration.
  // Initial generation remains consistent and predictable.
  if (data.isRegeneration === true) {
    temperature =
      data.regenerationAttempt >= 2 ? 0.6 : 0.4;
  } else {
    temperature = 0.1;
  }

  break;
}


    default: {
      throw new Error(`Unsupported AI task: ${task}`);
    }
  }

  const result = await generateOllamaResponse({
    systemPrompt,
    userPrompt,
    temperature,
  });

  return {
    success: true,
    task,
    provider: result.provider,
    model: result.model,
    output: result.response,
    latencyMs: result.latencyMs,
    usage: result.usage,
    generatedAt: new Date().toISOString(),
  };
}
