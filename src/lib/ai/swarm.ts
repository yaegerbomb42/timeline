import OpenAI from "openai";

/**
 * Provider configuration for the AI swarm.
 * Each provider uses OpenAI-compatible API and is raced in parallel
 * for maximum speed. Multiple API keys per provider enable
 * round-robin load distribution to avoid rate limits.
 */

export type ProviderName = "groq" | "cerebras" | "fireworks" | "nvidia";

interface ProviderConfig {
  name: ProviderName;
  baseURL: string;
  model: string;
  keys: string[];
}

// Round-robin counters per provider (module-level state persists across requests)
const keyCounters: Record<ProviderName, number> = {
  groq: 0,
  cerebras: 0,
  fireworks: 0,
  nvidia: 0,
};

function getEnvKeys(prefix: string, count: number): string[] {
  const keys: string[] = [];
  // Try numbered keys first (e.g., CEREBRAS_API_KEY_1, _2, etc.)
  for (let i = 1; i <= count; i++) {
    const val = process.env[`${prefix}_${i}`];
    if (val) keys.push(val);
  }
  // Also try the unnumbered key
  const single = process.env[prefix];
  if (single && !keys.includes(single)) keys.push(single);
  return keys;
}

/** Build provider configs from environment variables */
export function getProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  const groqKeys = getEnvKeys("GROQ_API_KEY", 1);
  if (groqKeys.length > 0) {
    providers.push({
      name: "groq",
      baseURL: "https://api.groq.com/openai/v1",
      model: "llama-3.3-70b-versatile",
      keys: groqKeys,
    });
  }

  const cerebrasKeys = getEnvKeys("CEREBRAS_API_KEY", 4);
  if (cerebrasKeys.length > 0) {
    providers.push({
      name: "cerebras",
      baseURL: "https://api.cerebras.ai/v1",
      model: "llama3.1-8b",
      keys: cerebrasKeys,
    });
  }

  const fireworksKeys = getEnvKeys("FIREWORKS_API_KEY", 1);
  if (fireworksKeys.length > 0) {
    providers.push({
      name: "fireworks",
      baseURL: "https://api.fireworks.ai/inference/v1",
      model: "accounts/fireworks/models/llama-v3p1-70b-instruct",
      keys: fireworksKeys,
    });
  }

  const nvidiaKeys = getEnvKeys("NVIDIA_API_KEY", 5);
  if (nvidiaKeys.length > 0) {
    providers.push({
      name: "nvidia",
      baseURL: "https://integrate.api.nvidia.com/v1",
      model: "meta/llama-3.1-70b-instruct",
      keys: nvidiaKeys,
    });
  }

  return providers;
}

/** Get an OpenAI client for the given provider, round-robining API keys */
export function getClient(provider: ProviderConfig): OpenAI {
  const idx = keyCounters[provider.name] % provider.keys.length;
  keyCounters[provider.name] = idx + 1;
  return new OpenAI({
    baseURL: provider.baseURL,
    apiKey: provider.keys[idx],
  });
}

/**
 * Race all available providers in parallel.
 * Returns the fastest successful response.
 * Falls back to sequential retry if Promise.any rejects (all failed).
 */
export async function raceProviders(
  prompt: string,
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<{ text: string; provider: ProviderName }> {
  const providers = getProviders();
  if (providers.length === 0) {
    throw new Error("No AI providers configured. Set API keys in environment variables.");
  }

  const { temperature = 0.3, maxTokens = 8192 } = options;

  const attempts = providers.map(async (provider) => {
    const client = getClient(provider);
    const response = await client.chat.completions.create({
      model: provider.model,
      messages: [{ role: "user", content: prompt }],
      temperature,
      max_tokens: maxTokens,
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) throw new Error(`Empty response from ${provider.name}`);

    return { text, provider: provider.name };
  });

  // Promise.any resolves with the first fulfilled promise
  return Promise.any(attempts);
}
