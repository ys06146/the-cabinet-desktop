export interface WindowCloseEvent {
  preventDefault(): void;
}

export interface WindowCloseTarget {
  close(): void;
  isDestroyed(): boolean;
}

export interface WindowCloseGuardDependencies {
  onBlocked: (error: Error) => void;
  prepare: () => Promise<void>;
  shouldBypass: () => boolean;
}

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export class WindowCloseGuard {
  private allowClose = false;
  private preparation: Promise<void> | null = null;

  constructor(private readonly dependencies: WindowCloseGuardDependencies) {}

  handle(event: WindowCloseEvent, target: WindowCloseTarget): void {
    if (this.allowClose || this.dependencies.shouldBypass()) {
      return;
    }

    event.preventDefault();
    if (this.preparation) {
      return;
    }

    const attempt = Promise.resolve()
      .then(() => this.dependencies.prepare())
      .then(() => {
        if (target.isDestroyed()) {
          return;
        }
        this.allowClose = true;
        target.close();
      })
      .catch((error: unknown) => {
        this.dependencies.onBlocked(asError(error));
      })
      .finally(() => {
        if (this.preparation === attempt) {
          this.preparation = null;
        }
      });

    this.preparation = attempt;
  }
}
