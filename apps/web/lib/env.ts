import "server-only";
import { z } from "zod";

const emptyToUndefined = (value: unknown) =>
  value === "" || value === undefined ? undefined : value;

const optionalUrl = z.preprocess(emptyToUndefined, z.string().url().optional());

const optionalString = z.preprocess(emptyToUndefined, z.string().min(1).optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_SUPABASE_URL: optionalUrl,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: optionalString,
  SUPABASE_SERVICE_ROLE_KEY: optionalString,
  OPENAI_API_KEY: optionalString,
  OPENAI_VISION_MODEL: z.string().default("gpt-4.1-mini"),
  OPENAI_EXTRACTION_PROMPT_VERSION: z.string().default("v1"),
  OPEN_FOOD_FACTS_ENABLED: z
    .enum(["true", "false"])
    .default("true")
    .transform((value) => value === "true"),
  OPEN_FOOD_FACTS_BASE_URL: z.string().url().default("https://world.openfoodfacts.org"),
  OPEN_FOOD_FACTS_USER_AGENT: z.string().default("CanIBringThis/0.1"),
  OPEN_FOOD_FACTS_CONTACT_EMAIL: optionalString,
  UPSTASH_REDIS_REST_URL: optionalUrl,
  UPSTASH_REDIS_REST_TOKEN: optionalString,
  ANONYMOUS_KEY_HMAC_SECRET: optionalString,
  SUBMISSION_TOKEN_SECRET: optionalString,
  SENTRY_DSN: optionalString,
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(12_582_912),
  MAX_SANITIZED_IMAGE_BYTES: z.coerce.number().int().positive().default(3_145_728),
  MAX_IMAGE_DIMENSION: z.coerce.number().int().positive().default(2200),
  EXTRACTION_DAILY_LIMIT: z.coerce.number().int().positive().default(200),
  EXTRACTION_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.72),
});

export type AppEnv = z.infer<typeof envSchema>;

function readEnv(): AppEnv {
  const parsed = envSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_VISION_MODEL: process.env.OPENAI_VISION_MODEL,
    OPENAI_EXTRACTION_PROMPT_VERSION: process.env.OPENAI_EXTRACTION_PROMPT_VERSION,
    OPEN_FOOD_FACTS_ENABLED: process.env.OPEN_FOOD_FACTS_ENABLED,
    OPEN_FOOD_FACTS_BASE_URL: process.env.OPEN_FOOD_FACTS_BASE_URL,
    OPEN_FOOD_FACTS_USER_AGENT: process.env.OPEN_FOOD_FACTS_USER_AGENT,
    OPEN_FOOD_FACTS_CONTACT_EMAIL: process.env.OPEN_FOOD_FACTS_CONTACT_EMAIL,
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
    ANONYMOUS_KEY_HMAC_SECRET: process.env.ANONYMOUS_KEY_HMAC_SECRET,
    SUBMISSION_TOKEN_SECRET: process.env.SUBMISSION_TOKEN_SECRET,
    SENTRY_DSN: process.env.SENTRY_DSN,
    LOG_LEVEL: process.env.LOG_LEVEL,
    MAX_UPLOAD_BYTES: process.env.MAX_UPLOAD_BYTES,
    MAX_SANITIZED_IMAGE_BYTES: process.env.MAX_SANITIZED_IMAGE_BYTES,
    MAX_IMAGE_DIMENSION: process.env.MAX_IMAGE_DIMENSION,
    EXTRACTION_DAILY_LIMIT: process.env.EXTRACTION_DAILY_LIMIT,
    EXTRACTION_CONFIDENCE_THRESHOLD: process.env.EXTRACTION_CONFIDENCE_THRESHOLD,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return parsed.data;
}

export const env = readEnv();

export function assertProductionExtractionReady(values: AppEnv = env): void {
  if (values.NODE_ENV !== "production") {
    return;
  }
  const missing: string[] = [];
  if (!values.OPENAI_API_KEY) missing.push("OPENAI_API_KEY");
  if (!values.UPSTASH_REDIS_REST_URL) missing.push("UPSTASH_REDIS_REST_URL");
  if (!values.UPSTASH_REDIS_REST_TOKEN) missing.push("UPSTASH_REDIS_REST_TOKEN");
  if (!values.SUBMISSION_TOKEN_SECRET) missing.push("SUBMISSION_TOKEN_SECRET");
  if (missing.length > 0) {
    throw new Error(
      `Production ingredient extraction is disabled until these are configured: ${missing.join(", ")}`,
    );
  }
}
