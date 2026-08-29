import "server-only";
import { env } from "@/lib/env";
import type { ExtractionProvider } from "./contracts";
import { GeminiExtractionProvider } from "./gemini-provider";
import { OpenAiExtractionProvider } from "./openai-provider";

export function createExtractionProviders(): ExtractionProvider[] {
  const geminiProviders: ExtractionProvider[] = [];
  if (env.GEMINI_API_KEY) {
    geminiProviders.push(
      new GeminiExtractionProvider(env.GEMINI_PRIMARY_MODEL, env.GEMINI_API_KEY),
      new GeminiExtractionProvider(env.GEMINI_ESCALATION_MODEL, env.GEMINI_API_KEY),
    );
  }
  const openAiProviders: ExtractionProvider[] = [];
  if (env.OPENAI_API_KEY) {
    openAiProviders.push(
      new OpenAiExtractionProvider(env.OPENAI_VISION_MODEL, env.OPENAI_API_KEY),
    );
  }
  const providers =
    env.AI_PRIMARY_PROVIDER === "openai"
      ? [...openAiProviders, ...geminiProviders]
      : [...geminiProviders, ...openAiProviders];
  return providers.slice(0, 3);
}
