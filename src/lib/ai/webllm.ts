"use client";

import { CreateMLCEngine, MLCEngine } from "@mlc-ai/web-llm";

// Qwen3-0.6B is a good balance between size and capability
const MODEL_NAME = "Qwen3-0.6B-q4f16_1-MLC";

let engine: MLCEngine | null = null;
let initPromise: Promise<MLCEngine> | null = null;

/**
 * Initialize the WebLLM engine with Qwen3-0.6B model
 * This runs entirely in the browser using WebGPU
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

  const prompt = `You are a helpful AI assistant analyzing a personal timeline. Use the provided context to answer the user's question accurately and concisely.

TIMELINE CONTEXT:
${context}

USER QUESTION: ${query}

ANSWER:`;

  const response = await llm.chat.completions.create({
    messages: [
      {
        role: "user",
        content: prompt,
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
