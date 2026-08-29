import { describe, expect, it, vi } from "vitest";
import { InMemoryExtractionExecutionPolicy } from "@/lib/ai/execution-policy";

describe("Phase 7 provider execution policy", () => {
  it("opens a provider circuit after repeated outages and recovers after cooldown", async () => {
    let now = 100;
    const policy = new InMemoryExtractionExecutionPolicy({
      maxConcurrency: 2,
      failureThreshold: 2,
      cooldownMs: 50,
      now: () => now,
    });
    const outage = vi.fn(async () => {
      throw new Error("provider unavailable");
    });

    await expect(policy.run("gemini:model", outage)).rejects.toThrow();
    await expect(policy.run("gemini:model", outage)).rejects.toThrow();
    await expect(
      policy.run("gemini:model", async () => ({ outputText: "unused" })),
    ).rejects.toMatchObject({
      code: "PROVIDER_CIRCUIT_OPEN",
    });

    now = 151;
    await expect(
      policy.run("gemini:model", async () => ({ outputText: "recovered" })),
    ).resolves.toMatchObject({ outputText: "recovered" });
  });

  it("rejects excess in-process concurrency instead of building an unbounded queue", async () => {
    const policy = new InMemoryExtractionExecutionPolicy({
      maxConcurrency: 1,
      failureThreshold: 3,
      cooldownMs: 50,
    });
    let release: (() => void) | undefined;
    const first = policy.run(
      "gemini:model",
      () =>
        new Promise((resolve) => {
          release = () => resolve({ outputText: "done" });
        }),
    );

    await expect(
      policy.run("openai:model", async () => ({ outputText: "overflow" })),
    ).rejects.toMatchObject({
      code: "PROVIDER_CONCURRENCY_LIMIT",
    });
    release?.();
    await expect(first).resolves.toMatchObject({ outputText: "done" });
  });
});
