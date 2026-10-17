import { z } from "zod";

export class ConfigurationError extends Error {
  constructor(readonly keys: string[]) {
    super(`Configure ${keys.join(", ")} before enabling this capability.`);
    this.name = "ConfigurationError";
  }
}

export type Environment = Record<string, string | undefined>;
export const integrationKeys = {
  database: ["DATABASE_URL"],
  auth: ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"],
  storage: ["SUPABASE_URL", "SUPABASE_SECRET_KEY", "STORAGE_BUCKET"],
  reasoning: ["GEMINI_API_KEY", "GEMINI_MODEL"],
  embeddings: ["GEMINI_API_KEY", "GEMINI_EMBEDDING_MODEL"],
  google: ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "TOKEN_ENCRYPTION_KEY", "APP_URL"],
  voice: ["ELEVENLABS_API_KEY", "ELEVENLABS_AGENT_ID", "ELEVENLABS_WEBHOOK_SECRET", "ELEVENLABS_TOOL_SECRET"],
  stripe: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"],
  sandbox: ["PAYMENT_SANDBOX_SECRET"],
  discovery: ["EXA_API_KEY"],
  email: ["RESEND_API_KEY", "RESEND_FROM"],
} as const;
export type Integration = keyof typeof integrationKeys;

export function requireConfiguration<K extends string>(keys: readonly K[], env: Environment = process.env): Record<K, string> {
  const missing = keys.filter((key) => !env[key]?.trim());
  if (missing.length) throw new ConfigurationError([...missing]);
  return Object.fromEntries(keys.map((key) => [key, env[key]!.trim()])) as Record<K, string>;
}

// Gemini is the default reasoning provider; Claude remains available by explicit selection.
export const reasoningKeys = (env: Environment = process.env) => env.REASONING_PROVIDER?.trim() === "anthropic" ? ["ANTHROPIC_API_KEY", "ANTHROPIC_MODEL"] : integrationKeys.reasoning;
export function integrationStatus(env: Environment = process.env) {
  return Object.fromEntries(Object.entries({ ...integrationKeys, reasoning: reasoningKeys(env) }).map(([name, keys]) => {
    const missing = keys.filter((key) => !env[key]?.trim());
    return [name, { configured: missing.length === 0, missing }];
  }));
}

export function runtimeConfig(env: Environment = process.env) {
  const value = z.object({
    APP_URL: z.url().default("http://localhost:4173"),
    CREWMORI_BACKEND_ENABLED: z.enum(["true", "false"]).default("false"),
    MAIL_PROVIDER: z.enum(["google", "resend"]).default("google"),
    REASONING_PROVIDER: z.enum(["gemini", "anthropic"]).default("gemini"),
    PAYMENT_PROVIDER: z.enum(["sandbox", "stripe_test"]).default("sandbox"),
    DATABASE_POOL_SIZE: z.coerce.number().int().min(1).max(20).default(5),
    AGENT_MAX_OUTPUT_TOKENS: z.coerce.number().int().min(256).max(4096).default(1500),
    AGENT_DAILY_TOKEN_BUDGET: z.coerce.number().int().min(1).max(1000000).default(20000),
    GEMINI_EMBEDDING_DIMENSIONS: z.coerce.number().int().min(128).max(3072).default(768),
  }).safeParse(env);
  if (!value.success) throw new ConfigurationError(value.error.issues.map((issue) => issue.path.join(".")));
  const config = value.data;
  const url = new URL(config.APP_URL);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new ConfigurationError(["APP_URL (HTTPS origin, or local HTTP origin)"]);
  }
  return { ...config, APP_URL: url.origin, enabled: config.CREWMORI_BACKEND_ENABLED === "true" };
}
