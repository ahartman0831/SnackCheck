import type { ProviderResponse } from "./contracts";

export type ExtractionExecutionRejection =
  "PROVIDER_CIRCUIT_OPEN" | "PROVIDER_CONCURRENCY_LIMIT";

export class ExtractionExecutionError extends Error {
  constructor(readonly code: ExtractionExecutionRejection) {
    super(code);
    this.name = "ExtractionExecutionError";
  }
}

export interface ExtractionExecutionPolicy {
  run(
    providerKey: string,
    operation: () => Promise<ProviderResponse>,
  ): Promise<ProviderResponse>;
}

interface CircuitState {
  failures: number;
  openUntil: number;
}

export class InMemoryExtractionExecutionPolicy implements ExtractionExecutionPolicy {
  private active = 0;
  private readonly circuits = new Map<string, CircuitState>();

  constructor(
    private readonly options: {
      maxConcurrency: number;
      failureThreshold: number;
      cooldownMs: number;
      now?: () => number;
    },
  ) {}

  async run(
    providerKey: string,
    operation: () => Promise<ProviderResponse>,
  ): Promise<ProviderResponse> {
    const now = (this.options.now ?? Date.now)();
    const circuit = this.circuits.get(providerKey);
    if (circuit && circuit.openUntil > now) {
      throw new ExtractionExecutionError("PROVIDER_CIRCUIT_OPEN");
    }
    if (this.active >= this.options.maxConcurrency) {
      throw new ExtractionExecutionError("PROVIDER_CONCURRENCY_LIMIT");
    }

    this.active += 1;
    try {
      const response = await operation();
      this.circuits.delete(providerKey);
      return response;
    } catch (error) {
      if (!(error instanceof ExtractionExecutionError)) {
        const failures = (circuit?.failures ?? 0) + 1;
        this.circuits.set(providerKey, {
          failures,
          openUntil:
            failures >= this.options.failureThreshold ? now + this.options.cooldownMs : 0,
        });
      }
      throw error;
    } finally {
      this.active -= 1;
    }
  }
}

export const sharedExtractionExecutionPolicy = new InMemoryExtractionExecutionPolicy({
  maxConcurrency: 2,
  failureThreshold: 3,
  cooldownMs: 30_000,
});
