
import { z } from "zod";
import { findInactiveCustomersTool } from "../tools/findInactiveCustomers.js";

/**
 * GrowPilot AI - Tool Registry
 *
 * Centralized tool management:
 * - Register available AI tools
 * - Validate tool arguments
 * - Execute tools safely
 * - Provide tool definitions to AI models
 */

// Tool input validation schemas
const toolSchemas = {
  find_inactive_customers: z.object({
    businessId: z.string().regex(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    ),
    limit: z.number().int().min(1).max(100).default(20),
  }).strict(),
};

// Registered tools
const tools = new Map([
  [findInactiveCustomersTool.name, findInactiveCustomersTool],
]);

/**
 * Get all registered tool definitions.
 * Used by AI models to understand available tools.
 */
export function getAvailableTools() {
  return Array.from(tools.values()).map((tool) => ({
    name: tool.name,
    description: tool.description,
    parameters: tool.parameters,
  }));
}

/**
 * Get a tool by name.
 */
export function getTool(name) {
  return tools.get(name) ?? null;
}

/**
 * Execute a registered tool.
 *
 * Only allowlisted tools can execute.
 * Arguments are validated before execution.
 */
export async function executeTool(name, args = {}) {
  const tool = getTool(name);

  if (!tool) {
    throw new Error(`Tool not registered: ${name}`);
  }

  const schema = toolSchemas[name];

  if (!schema) {
    throw new Error(`Validation schema missing for tool: ${name}`);
  }

  const validatedArgs = schema.parse(args);

  const startedAt = Date.now();

  try {
    const result = await tool.execute(validatedArgs);

    return {
      success: true,
      tool: name,
      durationMs: Date.now() - startedAt,
      result,
    };
  } catch (error) {
    // Never expose secret configuration or raw database errors
    console.error(`Tool execution failed [${name}]:`, error.message);

    throw error;
  }
}
