
import axios from "axios";
import { env } from "./env.js";

/**
 * GrowPilot AI — AI Model Configuration
 *
 * Ollama local inference provider.
 *
 * Responsibilities:
 * - Check AI model availability
 * - Send prompts to Ollama
 * - Handle timeouts and model errors
 * - Track inference latency
 * - Return structured AI responses
 *
 * Gemini and additional models can be added later.
 */

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL || "qwen2.5:3b";

const ollamaClient = axios.create({
  baseURL: OLLAMA_BASE_URL,
  timeout: 120000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Check Ollama server and model availability
export async function checkOllamaAvailability() {
  try {
    const response = await ollamaClient.get("/api/tags");

    const installedModels = response.data.models || [];

    const modelAvailable = installedModels.some(
      (model) => model.name === OLLAMA_MODEL
    );

    return {
      available: modelAvailable,
      provider: "ollama",
      configuredModel: OLLAMA_MODEL,
      installedModels: installedModels.map(
        (model) => model.name
      ),
    };

  } catch (error) {
    return {
      available: false,
      provider: "ollama",
      configuredModel: OLLAMA_MODEL,
      error: error.message,
    };
  }
}

// Generate AI response using Ollama
export async function generateOllamaResponse({
  systemPrompt,
  userPrompt,
  temperature = 0.3,
}) {
  if (
    typeof userPrompt !== "string" ||
    !userPrompt.trim()
  ) {
    throw new Error("userPrompt is required");
  }

  const startedAt = Date.now();

  try {
    const response = await ollamaClient.post("/api/chat", {
      model: OLLAMA_MODEL,
      stream: false,
      format: "json",
      messages: [
        {
          role: "system",
          content: systemPrompt || "",
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      options: {
        temperature,
      },
    });

    const content = response.data.message?.content;

    if (!content) {
      throw new Error("Empty Ollama response");
    }

    let parsedResponse;

    try {
      parsedResponse = JSON.parse(content);
    } catch {
      throw new Error("AI returned invalid JSON");
    }

    return {
      success: true,
      provider: "ollama",
      model: OLLAMA_MODEL,
      response: parsedResponse,
      latencyMs: Date.now() - startedAt,
      usage: {
        promptTokens: response.data.prompt_eval_count ?? 0,
        completionTokens: response.data.eval_count ?? 0,
      },
    };

  } catch (error) {
    console.error("Ollama inference failed:", error.message);

    throw new Error(
      `AI model request failed: ${error.message}`
    );
  }
}
