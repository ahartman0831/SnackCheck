import "server-only";
import { env } from "@/lib/env";
import type { ExtractionProvider } from "./contracts";
import { GeminiExtractionProvider } from "./gemini-provider";
import { OpenAiExtractionProvider } from "./openai-provider";

export function createExtractionProviders(): ExtractionProvider[] {
  const providers: ExtractionProvider[] = [];
  if (env.GEMINI_API_KEY) {
    providers.push(
      new GeminiExtractionProvider(env.GEMINI_PRIMARY_MODEL, env.GEMINI_API_KEY),
      new GeminiExtractionProvider(env.GEMINI_ESCALATION_MODEL, env.GEMINI_API_KEY),
    );
  }
  if (env.OPENAI_API_KEY) {
    providers.push(
      new OpenAiExtractionProvider(env.OPENAI_VISION_MODEL, env.OPENAI_API_KEY),
    );
  }
  return providers.slice(0, 3);
}
