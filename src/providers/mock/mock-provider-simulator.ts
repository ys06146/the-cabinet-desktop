export interface MockProviderLatencyRange {
  minMs: number;
  maxMs: number;
}

export interface MockProviderSimulationOptions<Operation extends string> {
  latencyMs?: number | MockProviderLatencyRange;
  failureRate?: number;
  failureRateByOperation?: Partial<Record<Operation, number>>;
  random?: () => number;
}

function assertRate(rate: number, name: string): void {
  if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
    throw new RangeError(`${name} must be between 0 and 1.`);
  }
}

function assertLatency(latency: number | MockProviderLatencyRange): void {
  if (typeof latency === 'number') {
    if (!Number.isFinite(latency) || latency < 0) {
      throw new RangeError('latencyMs must be a non-negative number.');
    }
    return;
  }

  if (
    !Number.isFinite(latency.minMs) ||
    !Number.isFinite(latency.maxMs) ||
    latency.minMs < 0 ||
    latency.maxMs < latency.minMs
  ) {
    throw new RangeError('latencyMs must define a valid non-negative range.');
  }
}

export class MockProviderSimulator<Operation extends string> {
  private readonly latencyMs: number | MockProviderLatencyRange;
  private readonly failureRate: number;
  private readonly failureRateByOperation: Partial<Record<Operation, number>>;
  private readonly random: () => number;

  constructor(
    options: MockProviderSimulationOptions<Operation>,
    private readonly createError: (operation: Operation) => Error,
  ) {
    this.latencyMs = options.latencyMs ?? { minMs: 180, maxMs: 420 };
    this.failureRate = options.failureRate ?? 0;
    this.failureRateByOperation = options.failureRateByOperation ?? {};
    this.random = options.random ?? Math.random;

    assertLatency(this.latencyMs);
    assertRate(this.failureRate, 'failureRate');
    for (const operation of Object.keys(this.failureRateByOperation) as Operation[]) {
      const rate = this.failureRateByOperation[operation];
      if (rate !== undefined) {
        assertRate(rate, `failureRateByOperation.${operation}`);
      }
    }
  }

  async execute<T>(operation: Operation, createValue: () => T): Promise<T> {
    const latency = this.resolveLatency();
    if (latency > 0) {
      await new Promise<void>((resolve) => globalThis.setTimeout(resolve, latency));
    } else {
      await Promise.resolve();
    }

    const failureRate = this.failureRateByOperation[operation] ?? this.failureRate;
    if (failureRate > 0 && this.random() < failureRate) {
      throw this.createError(operation);
    }

    return createValue();
  }

  private resolveLatency(): number {
    if (typeof this.latencyMs === 'number') {
      return this.latencyMs;
    }
    const spread = this.latencyMs.maxMs - this.latencyMs.minMs;
    return Math.round(this.latencyMs.minMs + spread * this.random());
  }
}
