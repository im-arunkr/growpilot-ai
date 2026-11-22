
import { z } from "zod";
import { supabase } from "../config/supabase.js";
import { runAgent } from "../agent/agentRunner.js";
import { getAvailableTools } from "../agent/toolRegistry.js";
import { getAgentExecutionHistory } from "../agent/agentMemory.js";
import { getModelStatus } from "../agent/modelRouter.js";
import { routeAIRequest } from "../agent/modelRouter.js";
import { getBusinessAnalytics } from "../services/analytics.service.js";
import { getCustomerRetention } from "../services/retention.service.js";
import { getBusinessById } from "../services/business.service.js";
import {
  evaluateAgentRun,
  saveAgentEvaluation,
} from "../services/evaluation.service.js";
const runAgentSchema = z.object({
  businessId: z.string().regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Invalid business ID"
  ),
  goal: z.enum(["customer_retention"]).default("customer_retention"),
  limit: z.number().int().min(1).max(100).default(20),
}).strict();

// Execute AI Agent
export async function executeAgent(req, res, next) {
  try {
    const validation = runAgentSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid agent request",
        errors: z.treeifyError(validation.error),
      });
    }

    const result = await runAgent(validation.data);

    const statusCode = result.success
      ? 200
      : result.errorCode === "DUPLICATE_OPEN_ACTION"
        ? 409
        : 500;

    return res.status(statusCode).json(result);

  } catch (error) {
    next(error);
  }
}

// List available AI tools
export function listAgentTools(req, res) {
  return res.status(200).json({
    success: true,
    count: getAvailableTools().length,
    tools: getAvailableTools(),
  });
}

/**
 * GET /api/agent/history
 *
 * Fetch agent execution history with
 * optional runId and pagination.
 */

export async function getExecutionHistory(req, res, next) {
  try {
    const uuidSchema = z.string().regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    const querySchema = z.object({
      businessId: uuidSchema,
      runId: uuidSchema.optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    }).strict();

    const parsed = querySchema.safeParse(req.query);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid execution history parameters",
        errors: z.treeifyError(parsed.error),
      });
    }

    const result = await getAgentExecutionHistory(parsed.data);

    return res.status(200).json({
      success: true,
      message: "Agent execution history fetched successfully",
      data: result.logs,
      pagination: result.pagination,
      filters: result.filters,
      generatedAt: result.generatedAt,
    });

  } catch (error) {
    next(error);
  }
}

/**
 * GrowPilot AI — Evaluate Agent Run
 *
 * GET /api/agent/:runId/evaluation
 *
 * Evaluates operational performance:
 * - Action completion
 * - Human approvals and rejections
 * - Failed actions
 * - Simulated deliveries
 * - Recommended next steps
 */

export async function getAgentEvaluation(req, res, next) {
  try {
    const uuidSchema = z.string().regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      "Invalid UUID format"
    );

    const runId = uuidSchema.safeParse(req.params.runId);
    const businessId = uuidSchema.safeParse(req.query.businessId);

    if (!runId.success || !businessId.success) {
      return res.status(400).json({
        success: false,
        message: "Valid runId and businessId are required",
      });
    }

    const evaluation = await evaluateAgentRun(
      runId.data,
      businessId.data
    );

    return res.status(200).json({
      success: true,
      message: "Agent evaluation completed successfully",
      data: evaluation,
    });

  } catch (error) {
    if (error.message === "Agent run not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}


/**
 * GrowPilot AI — Save Agent Evaluation
 *
 * POST /api/agent/:runId/evaluation
 *
 * Calculates and persists the latest operational
 * evaluation results in Supabase.
 */

export async function persistAgentEvaluation(req, res, next) {
  try {
    const uuidSchema = z.string().regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      "Invalid UUID format"
    );

    const runId = uuidSchema.safeParse(req.params.runId);

    const bodySchema = z.object({
      businessId: uuidSchema,
    }).strict();

    const body = bodySchema.safeParse(req.body);

    if (!runId.success || !body.success) {
      return res.status(400).json({
        success: false,
        message: "Valid runId and businessId are required",
      });
    }

    const result = await saveAgentEvaluation(
      runId.data,
      body.data.businessId
    );

    return res.status(200).json({
      success: true,
      message: "Agent evaluation saved successfully",
      data: result,
    });

  } catch (error) {
    if (error.message === "Agent run not found") {
      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
}

/**
 * GrowPilot AI — Check AI Model Status
 *
 * GET /api/agent/models/status
 *
 * Checks whether the local Ollama server
 * and configured AI model are available.
 */

export async function checkAIModelStatus(req, res, next) {
  try {
    const modelStatus = await getModelStatus();

    return res.status(modelStatus.available ? 200 : 503).json({
      success: modelStatus.available,
      message: modelStatus.available
        ? "AI model is ready for inference"
        : "AI model is currently unavailable",
      data: modelStatus,
    });

  } catch (error) {
    next(error);
  }
}

/**
 * Generate AI Business Insights
 * POST /api/agent/insights
 *
 * Fetches actual business data and uses Ollama
 * to generate evidence-based business insights.
 */

export async function generateBusinessInsights(req, res, next) {
  try {
    const businessIdSchema = z.string().regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    const requestSchema = z.object({
      businessId: businessIdSchema,
    }).strict();

    const parsed = requestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Valid businessId is required",
      });
    }

    const businessId = parsed.data.businessId;

    // Fetch actual business analytics
    const [analytics, retention] = await Promise.all([
      getBusinessAnalytics(businessId),
      getCustomerRetention(businessId),
    ]);

    // Send summarized facts to AI model
    const aiResult = await routeAIRequest({
      task: "business_analysis",
      data: {
        business: analytics.business,
        analytics: analytics.summary,
        retention: retention.summary,
      },
    });

    return res.status(200).json({
      success: true,
      message: "AI business insights generated successfully",
      data: {
        businessId,
        provider: aiResult.provider,
        model: aiResult.model,
        insights: aiResult.output,
        latencyMs: aiResult.latencyMs,
        usage: aiResult.usage,
        generatedAt: aiResult.generatedAt,
      },
    });

  } catch (error) {
    if (error.message === "Business not found") {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    if (error.message.startsWith("AI model request failed")) {
      return res.status(503).json({
        success: false,
        message: "AI model inference failed",
      });
    }

    next(error);
  }
}

/**
 * GrowPilot AI — AI Customer Retention Strategy
 *
 * POST /api/agent/retention-strategy
 *
 * Fetches actual customer data and generates
 * an AI-powered retention recommendation.
 *
 * Read-only: does not approve or execute actions.
 */

export async function generateRetentionStrategy(req, res, next) {
  try {
    const uuidSchema = z.string().regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      "Invalid UUID format"
    );

    const requestSchema = z.object({
      businessId: uuidSchema,
      customerId: uuidSchema,
    }).strict();

    const parsed = requestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Valid businessId and customerId are required",
        errors: z.treeifyError(parsed.error),
      });
    }

    const { businessId, customerId } = parsed.data;

    // Fetch verified customer retention data
    const retention = await getCustomerRetention(businessId);

    const customer = retention.customers.find(
      (item) => item.customerId === customerId
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found in this business",
      });
    }

    // Strategy is relevant only for at-risk customers
    if (
      customer.status !== "inactive" &&
      customer.status !== "declining"
    ) {
      return res.status(422).json({
        success: false,
        message: "Customer is not currently at risk",
        customerStatus: customer.status,
      });
    }

    const priority = customer.status === "inactive"
      ? "high"
      : "medium";

    // Generate strategy using local Ollama model
    const aiResult = await routeAIRequest({
      task: "retention_strategy",
      data: {
        businessName: retention.business.name,
        customer: {
          customerName: customer.customerName,
          status: customer.status,
          inactiveDays: customer.inactiveDays,
          totalTransactions: customer.totalTransactions,
          priority,
        },
      },
    });

    // Validate and normalize AI output
    const strategySchema = z.object({
      reason: z.string().trim().min(10),
      strategy: z.string().trim().min(10),
      expectedOutcome: z.string().trim().min(10),
      priority: z.enum(["high", "medium", "low"]),
      requiresApproval: z.boolean(),
    });

    const validated = strategySchema.safeParse(aiResult.output);

    if (!validated.success) {
      return res.status(502).json({
        success: false,
        message: "AI generated an invalid strategy format",
      });
    }

    // Safety guardrail for AI-generated strategies
    const unsafePatterns = [
      /\bemail\b/i,
      /\bwhatsapp\b/i,
      /\bsms\b/i,
      /\bdiscount\b/i,
      /\bspecial offer\b/i,
      /\bfree consultation\b/i,
      /\bguaranteed?\b/i,
      /\bwill definitely\b/i,
      /\bloss of interest\b/i,
      /\bloss of contact\b/i,
      /\bcontact issues?\b/i,
    ];

    const aiStrategyText = [
      validated.data.reason,
      validated.data.strategy,
      validated.data.expectedOutcome,
    ].join(" ");

    const guardrailTriggered = unsafePatterns.some(
      (pattern) => pattern.test(aiStrategyText)
    );

    const safeStrategy = guardrailTriggered
      ? {
        reason:
          `${customer.customerName} has not completed a ` +
          `transaction for ${customer.inactiveDays} days.`,

        strategy:
          "Prepare a personalized customer re-engagement " +
          "message for owner review. Use simulation only.",

        expectedOutcome:
          "The proposed action may help identify " +
          "a customer re-engagement opportunity. " +
          "Actual retention improvement is not yet measured.",

        priority,
        requiresApproval: true,
      }
      : {
        ...validated.data,
        priority,
        requiresApproval: true,
      };

    return res.status(200).json({
      success: true,
      message: "AI retention strategy generated successfully",
      data: {
        businessId,
        customerId,
        customerName: customer.customerName,
        customerStatus: customer.status,
        inactiveDays: customer.inactiveDays,

        strategy: safeStrategy,
        guardrailTriggered,

        provider: aiResult.provider,
        model: aiResult.model,
        latencyMs: aiResult.latencyMs,
        usage: aiResult.usage,

        executionAllowed: false,
        generatedAt: aiResult.generatedAt,
      },
    });

  } catch (error) {
    if (error.message === "Business not found") {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    if (error.message.startsWith("AI model request failed")) {
      return res.status(503).json({
        success: false,
        message: "AI model inference failed",
      });
    }

    next(error);
  }
}

/**
 * GrowPilot AI — Generate AI Customer Message
 *
 * POST /api/agent/message-draft
 *
 * Generates a customer message draft using Ollama.
 * Does not send, approve or execute messages.
 */


export async function generateCustomerMessageDraft(req, res, next) {
  try {
    const uuidSchema = z.string().regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );

    const requestSchema = z
      .object({
        businessId: uuidSchema,
        customerId: uuidSchema,
      })
      .strict();

    const parsed = requestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Valid businessId and customerId are required",
      });
    }

    const { businessId, customerId } = parsed.data;

    // 1. Get verified business and customer information.
    const [business, retention] = await Promise.all([
      getBusinessById(businessId),
      getCustomerRetention(businessId),
    ]);

    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found",
      });
    }

    const customer = retention.customers.find(
      (item) => item.customerId === customerId
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    // 2. Find the latest pending approval action BEFORE AI generation.
    const { data: pendingActions, error: lookupError } =
      await supabase
        .from("agent_actions")
        .select("id, status, payload")
        .eq("business_id", businessId)
        .eq("customer_id", customerId)
        .eq("action_type", "send_message")
        .eq("status", "pending_approval")
        .order("created_at", { ascending: false })
        .limit(1);

    if (lookupError) {
      throw lookupError;
    }

    const pendingAction = pendingActions?.[0];

    if (!pendingAction) {
      return res.status(404).json({
        success: false,
        message:
          "No pending approval action found for this customer",
      });
    }

    // 3. Read the existing saved draft, if any.
    const existingDraftValue =
      pendingAction.payload?.messageDraft;

    const previousDraft =
      typeof existingDraftValue === "string"
        ? existingDraftValue.trim()
        : typeof existingDraftValue?.message === "string"
          ? existingDraftValue.message.trim()
          : "";

    const isRegeneration = previousDraft.length > 0;

    // 4. Validate AI-generated message structure.
    const messageSchema = z.object({
      message: z.string().trim().min(10).max(500),
      requiresApproval: z.boolean(),
      executionMode: z.literal("simulation"),
    });

    // 5. Existing deterministic safety guardrails.
    const unsafePatterns = [
      // Unsupported offers and promises
      /\bdiscount\b/i,
      /\bspecial offer\b/i,
      /\bguaranteed?\b/i,
      /\bfree consultation\b/i,
      /\bcashback\b/i,
      /\breward\b/i,
      /\b\d+%\s*(off|discount)\b/i,

      // Unsupported account-related claims
      /\baccount\s+(is\s+)?(inactive|blocked|disabled|expired)\b/i,
      /\bactivat(e|ion|ing)\s+(your\s+)?account\b/i,
      /\baccount\s+(active|activate|activation)\b/i,

      // Hinglish account-related claims
      /account\s+active\s+kar/i,
      /account\s+activate\s+kar/i,
      /account\s+band\s+ho/i,
      /khata\s+band\s+ho/i,

      // Unsupported outreach claims
      /\bwhatsapp\b/i,
      /\bsms\b/i,
      /\bemail\b/i,
    ];

    // 6. Safe fallback message.
    const fallbackMessage = `Hello ${customer.customerName}! 👋

Greetings from ${business.name}!

We are here to help you with your digital service needs.

📋 Our Common Services:

💳 AEPS & Money Withdrawal
💸 Money Transfer
📱 Mobile & DTH Recharge
💡 Electricity & Utility Bill Payments
📝 Online Form Filling & Applications

Need any assistance? Feel free to contact us!

Thank you for choosing ${business.name}.`;

    // Normalize text for duplicate detection.
    const normalizeMessage = (value) =>
      String(value ?? "")
        .normalize("NFKC")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();

    // 7. Generate a message. Retry once only for regeneration.
    const maximumAttempts = isRegeneration ? 2 : 1;

    let aiResult = null;
    let safeMessage = "";
    let guardrailTriggered = false;
    let identicalToPrevious = false;

    for (
      let attempt = 1;
      attempt <= maximumAttempts;
      attempt++
    ) {
      const regenerationInstructions = isRegeneration
        ? `Generate a meaningfully different alternative to the previous message.

Previous message:
${previousDraft}

Requirements:
- Write in simple, professional English.
- Change the opening, sentence structure, and closing.
- Do not repeat the previous message.
- Do not invent discounts, offers, or guarantees.
- Do not make unsupported claims.
- Do not pressure the customer.
- Do not claim that marketing consent was provided.
- Keep the message concise and appropriate for human review.
- This message is a draft only.
- Never imply that a message has already been sent.
${
  attempt === 2
    ? "- The previous attempt was too similar. Use a noticeably different structure and wording."
    : ""
}`
        : undefined;

      aiResult = await routeAIRequest({
        task: "message_generation",
        data: {
          businessName: business.name,
          customerName: customer.customerName,
          customerStatus: customer.status,

          // Additional regeneration context.
          ...(isRegeneration
            ? {
                previousDraft,
                isRegeneration: true,
                regenerationAttempt: attempt,
                regenerationInstructions,
              }
            : {}),
        },
      });

      // Validate AI-generated output.
      const validation = messageSchema.safeParse(
        aiResult.output
      );

      if (!validation.success) {
        return res.status(502).json({
          success: false,
          message: "AI generated an invalid message format",
        });
      }

      const aiMessage = validation.data.message;

      // Detect scripts outside the permitted ASCII characters,
      // while ignoring emoji characters.
      const containsNonEnglishScript =
        /[^\x00-\x7F]/u.test(
          aiMessage.replace(
            /[\p{Emoji_Presentation}\p{Extended_Pictographic}\uFE0F]/gu,
            ""
          )
        );

      // Detect unsupported claims.
      const containsUnsafeContent = unsafePatterns.some(
        (pattern) => pattern.test(aiMessage)
      );

      guardrailTriggered =
        containsNonEnglishScript ||
        containsUnsafeContent;

      safeMessage = guardrailTriggered
        ? fallbackMessage
        : aiMessage;

      // Preserve existing approved safety fields.
      // Never overwrite an existing saved draft with identical text.
      identicalToPrevious =
        isRegeneration &&
        normalizeMessage(safeMessage) ===
          normalizeMessage(previousDraft);

      if (!identicalToPrevious) {
        break;
      }
    }

    // 8. If regeneration produced the same message,
    // preserve the existing saved draft.
    if (identicalToPrevious) {
      return res.status(409).json({
        success: false,
        errorCode: "DRAFT_UNCHANGED",
        message:
          "AI generated the same message again. The existing saved draft has been preserved.",
        data: {
          businessId,
          customerId,
          actionId: pendingAction.id,
          draftPersisted: false,
          previousDraftPreserved: true,
          regenerationAttempted: true,
        },
      });
    }

    // 9. Merge the new draft into the existing action payload.
    const updatedPayload = {
      ...(pendingAction.payload ?? {}),

      messageDraft: safeMessage,

      messageDraftSource: guardrailTriggered
        ? "deterministic_fallback"
        : "ollama",

      messageDraftModel: aiResult.model,
      messageDraftGeneratedAt: new Date().toISOString(),

      requiresApproval: true,
      executionMode: "simulation",
      executionAllowed: false,
    };

    // 10. Save the new draft to the pending action.
    const { data: updatedAction, error: updateError } =
      await supabase
        .from("agent_actions")
        .update({
          payload: updatedPayload,
        })
        .eq("id", pendingAction.id)
        .eq("business_id", businessId)
        .eq("customer_id", customerId)
        .eq("status", "pending_approval")
        .select("id, status")
        .maybeSingle();

    if (updateError) {
      throw updateError;
    }

    if (!updatedAction) {
      return res.status(409).json({
        success: false,
        message:
          "Action status changed before the draft could be saved",
      });
    }

    // 11. Return successfully persisted draft.
    return res.status(200).json({
      success: true,

      message: isRegeneration
        ? "AI customer message regenerated successfully"
        : "AI customer message draft generated successfully",

      data: {
        businessId,
        customerId,
        actionId: updatedAction.id,
        customerName: customer.customerName,

        draft: safeMessage,
        draftPersisted: true,
        actionStatus: updatedAction.status,

        isRegeneration,
        draftChanged: isRegeneration
          ? normalizeMessage(safeMessage) !==
            normalizeMessage(previousDraft)
          : true,

        strategySource: guardrailTriggered
          ? "deterministic_fallback"
          : "ollama",

        guardrailTriggered,
        requiresApproval: true,
        executionAllowed: false,
        executionMode: "simulation",

        provider: aiResult.provider,
        model: aiResult.model,
        latencyMs: aiResult.latencyMs,
        usage: aiResult.usage,
        generatedAt: aiResult.generatedAt,
      },
    });
  } catch (error) {
    if (
      typeof error?.message === "string" &&
      error.message.startsWith("AI model request failed")
    ) {
      return res.status(503).json({
        success: false,
        message: "AI model inference failed",
      });
    }

    next(error);
  }
}
