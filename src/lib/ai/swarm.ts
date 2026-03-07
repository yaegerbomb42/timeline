import OpenAI from "openai";
import { GEMINI_MODEL } from "./config";

/**
 * Advanced Swarm Worker representing an individual API key (Bucket).
 */
interface Worker {
  id: string; // Unique ID (provider:index)
  provider: ProviderName;
  model: string;
  baseURL: string;
  apiKey: string;
  isBusy: boolean;
  cooldownUntil: number;
}

export type ProviderName =
  | "gemini"
  | "groq"
  | "cerebras"
  | "nvidia"
  | "openrouter"
  | "cohere"
  | "fireworks"
  | "siliconflow"
  | "novita"
  | "github";

/**
 * Precise safety cooldowns (ms) per provider to respect RPM limits.
 */
const COOLDOWNS: Record<string, number> = {
  gemini: 4500,     // ~13 RPM (Safe under 15 RPM)
  groq: 2200,       // ~27 RPM (Safe under 30 RPM)
  cerebras: 2200,   // ~27 RPM
  openrouter: 1000,
  github: 3000,     // Limited free tier
  default: 1000,
};

/**
 * Robustly fetch keys from environment variables.
 */
function getEnvKeys(providerName: string): string[] {
  const keys: string[] = [];
  const prefixes = [`VITE_${providerName.toUpperCase()}_API_KEY`, `${providerName.toUpperCase()}_API_KEY`];

  for (const prefix of prefixes) {
    const single = process.env[prefix];
    if (single && !keys.includes(single)) keys.push(single);

    for (let i = 1; i <= 20; i++) {
      const val = process.env[`${prefix}_${i}`];
      if (val && !keys.includes(val)) keys.push(val);
    }
  }

  if (providerName === 'openrouter') {
    const paid = process.env.VITE_OPENROUTER_API_KEY_PAID;
    if (paid && !keys.includes(paid)) keys.push(paid);
    const free = process.env.VITE_OPENROUTER_API_KEY_FREE;
    if (free && !keys.includes(free)) keys.push(free);
  }

  return keys;
}

/**
 * SwarmEngine: Singleton Multi-Key Load Balancer (Bucket Concurrency)
 */
export class SwarmEngine {
  private static instance: SwarmEngine;
  private workers: Worker[] = [];

  private constructor() {
    this.refreshWorkers();
  }

  public static getInstance(): SwarmEngine {
    if (!SwarmEngine.instance) {
      SwarmEngine.instance = new SwarmEngine();
    }
    return SwarmEngine.instance;
  }

  public getWorkerCount(): number {
    return this.workers.length;
  }

  /** Initialize workers from environment keys */
  public refreshWorkers() {
    this.workers = [];
    const configs: Array<{ name: ProviderName; baseURL: string; model: string }> = [
      { name: "gemini", baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/", model: GEMINI_MODEL },
      { name: "groq", baseURL: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
      { name: "cerebras", baseURL: "https://api.cerebras.ai/v1", model: "llama3.1-70b" },
      { name: "nvidia", baseURL: "https://integrate.api.nvidia.com/v1", model: "meta/llama-3.3-70b-instruct" },
      { name: "openrouter", baseURL: "https://openrouter.ai/v1", model: "meta-llama/llama-3.3-70b-instruct" },
      { name: "fireworks", baseURL: "https://api.fireworks.ai/inference/v1", model: "accounts/fireworks/models/llama-v3p1-70b-instruct" },
      { name: "siliconflow", baseURL: "https://api.siliconflow.cn/v1", model: "deepseek-ai/DeepSeek-V3" },
      { name: "novita", baseURL: "https://api.novita.ai/v3", model: "meta-llama/llama-3.1-70b-instruct" },
      { name: "cohere", baseURL: "https://api.cohere.com/v1", model: "command-r" },
      { name: "github", baseURL: "https://models.inference.ai.azure.com", model: "gpt-4o-mini" }
    ];

    for (const cfg of configs) {
      const keys = getEnvKeys(cfg.name);
      keys.forEach((key, index) => {
        this.workers.push({
          id: `${cfg.name}:${index}`,
          provider: cfg.name,
          model: cfg.model,
          baseURL: cfg.baseURL,
          apiKey: key,
          isBusy: false,
          cooldownUntil: 0,
        });
      });
    }

    console.log(`[SwarmEngine] Initialized with ${this.workers.length} workers across ${configs.length} providers.`);
  }

  /**
   * Finds the best available worker using a priority-shuffled waterfall.
   */
  private findWorker(): Worker | null {
    const now = Date.now();
    // Filter available workers
    const available = this.workers.filter(w => !w.isBusy && w.cooldownUntil <= now);

    if (available.length === 0) return null;

    // Shuffle and pick the one with the longest idle time (or just shuffle)
    // To maintain a healthy waterfall, we can group by provider and pick based on priority,
    // but for now, simple randomization across ALL healthy buckets is perfect.
    return available[Math.floor(Math.random() * available.length)];
  }

  /**
   * Execute a request through an available bucket.
   */
  public async execute(
    prompt: string,
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<{ text: string; provider: ProviderName }> {
    const worker = this.findWorker();

    if (!worker) {
      // If no workers available, wait a bit or throw
      // For simplicity in the API route, we throw so the client can retry or wait.
      throw new Error("All AI buckets are busy or cooling down. Please wait 5 seconds.");
    }

    const { temperature = 0.3, maxTokens = 8192 } = options;

    worker.isBusy = true;
    try {
      const client = new OpenAI({
        baseURL: worker.baseURL,
        apiKey: worker.apiKey,
        ...(worker.provider === 'openrouter' ? {
          defaultHeaders: { "HTTP-Referer": "https://turbotoolbox.me", "X-Title": "Timeline AI" }
        } : {})
      });

      const response = await client.chat.completions.create({
        model: worker.model,
        messages: [{ role: "user", content: prompt }],
        temperature,
        max_tokens: maxTokens,
      });

      const text = response.choices[0]?.message?.content?.trim();
      if (!text) throw new Error(`Empty response from ${worker.provider}`);

      return { text, provider: worker.provider };
    } finally {
      // Apply cooldown before releasing bucket
      const cooldown = COOLDOWNS[worker.provider] || COOLDOWNS.default;
      worker.isBusy = false;
      worker.cooldownUntil = Date.now() + cooldown;
    }
  }
}

/**
 * Compatibility wrapper for the existing runSwarm call.
 */
export async function runSwarm(
  prompt: string,
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<{ text: string; provider: ProviderName }> {
  return SwarmEngine.getInstance().execute(prompt, options);
}

/** Export helper to see if any providers are enabled */
export function hasProviders(): boolean {
  return SwarmEngine.getInstance().getWorkerCount() > 0;
}
