"use client";

import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

// Qwen2.5-1.5B provides a stronger local baseline while remaining lightweight
const MODEL_NAME = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";

let engine: MLCEngine | null = null;
let initPromise: Promise<MLCEngine> | null = null;

/**
 * Initialize the WebLLM engine with Qwen2.5-1.5B model
 * This runs entirely in the browser using WebGPU
 * Note: Context window size is determined by the model (typically 32K for Qwen2.5)
 * To handle large prompts, we should truncate context before sending to the model
 */
export async function initWebLLM(onProgress?: (progress: { text: string; progress: number }) => void): Promise<MLCEngine> {
  // Return existing engine if already initialized
  if (engine) return engine;
  
  // Return existing initialization promise if in progress
  if (initPromise) return initPromise;

  // Start new initialization
  initPromise = (async () => {
    try {
      const newEngine = await CreateMLCEngine(MODEL_NAME, {
        initProgressCallback: (info) => {
          onProgress?.({
            text: info.text,
            progress: info.progress || 0,
          });
        },
      });
      
      engine = newEngine;
      return newEngine;
    } catch (error) {
      // Reset promise on error so it can be retried
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Generate a response using the local WebLLM model
 * @param query - The user's question
 * @param context - Timeline context to provide to the model
 * @returns The generated response text
 */
export async function generateWithWebLLM(
  query: string,
  context: string,
  onProgress?: (progress: { text: string; progress: number }) => void
): Promise<string> {
  const llm = await initWebLLM(onProgress);

  // Truncate context if it's too large to avoid exceeding context window
  // Qwen2.5-1.5B typically has a 32K token context, but we'll be conservative
  const MAX_CONTEXT_CHARS = 8000; // Approximately 2000 tokens
  let truncatedContext = context;
  if (context.length > MAX_CONTEXT_CHARS) {
    truncatedContext = context.slice(0, MAX_CONTEXT_CHARS) + "\n\n[Context truncated for length...]";
  }

  const response = await llm.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are a helpful AI assistant analyzing a personal timeline. Use only the provided context to answer accurately and concisely. If the answer is missing from context, say so.",
      },
      {
        role: "user",
        content: `TIMELINE CONTEXT:\n${truncatedContext}\n\nUSER QUESTION: ${query}\n\nANSWER:`,
      },
    ],
    temperature: 0.7,
    max_tokens: 2048,
  });

  return response.choices[0]?.message?.content || "No response generated.";
}

/**
 * Check if WebGPU is available in the browser
 */
export function isWebGPUAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return "gpu" in navigator;
}

/**
 * Reset the WebLLM engine (useful for cleanup or testing)
 */
export async function resetWebLLM(): Promise<void> {
  if (engine) {
    await engine.unload();
    engine = null;
  }
  initPromise = null;
}
