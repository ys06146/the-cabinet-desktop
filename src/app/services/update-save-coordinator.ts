export type UpdateSaveTask = () => Promise<void> | void;

interface RegisteredSaveTask {
  key: string;
  label: string;
  run: UpdateSaveTask;
}

function asSaveError(label: string, error: unknown): Error {
  const detail = error instanceof Error ? error.message : String(error);
  return new Error(`${label} 저장에 실패했습니다. ${detail}`);
}

export class UpdateSaveCoordinator {
  private readonly tasks = new Map<string, RegisteredSaveTask>();
  private readonly inFlight = new Set<Promise<void>>();
  private readonly failures = new Map<string, Error>();
  private readonly failedTasks = new Map<string, RegisteredSaveTask>();

  register(key: string, label: string, run: UpdateSaveTask): () => void {
    const task = { key, label, run };
    this.tasks.set(key, task);

    return () => {
      if (this.tasks.get(key) !== task) {
        return;
      }
      this.tasks.delete(key);
      void this.track(task);
    };
  }

  async flushAll(): Promise<void> {
    await Promise.allSettled([...this.inFlight]);
    const retryTasks = [...this.failedTasks.values()].map((task) =>
      this.track(task),
    );
    await Promise.allSettled(retryTasks);
    const currentTasks = [...this.tasks.values()].map((task) => this.track(task));
    await Promise.allSettled(currentTasks);
    const failure = this.failures.values().next().value as Error | undefined;
    if (failure) {
      throw failure;
    }
  }

  private track(task: RegisteredSaveTask): Promise<void> {
    const operation = Promise.resolve()
      .then(task.run)
      .then(() => {
        if (this.failedTasks.get(task.key) === task) {
          this.failedTasks.delete(task.key);
          this.failures.delete(task.key);
        } else if (!this.failedTasks.has(task.key)) {
          this.failures.delete(task.key);
        }
      })
      .catch((error: unknown) => {
        const saveError = asSaveError(task.label, error);
        this.failures.set(task.key, saveError);
        this.failedTasks.set(task.key, task);
        throw saveError;
      });
    this.inFlight.add(operation);
    void operation.finally(() => this.inFlight.delete(operation)).catch(() => undefined);
    return operation;
  }
}

export const updateSaveCoordinator = new UpdateSaveCoordinator();
