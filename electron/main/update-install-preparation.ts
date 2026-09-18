export interface UpdatePreparationRequest {
  requestId: number;
}

export interface UpdatePreparationResponse {
  requestId: number;
  success: boolean;
  message?: string;
}

export interface UpdatePreparationTarget {
  id: number;
  isDestroyed: () => boolean;
  send: (channel: string, request: UpdatePreparationRequest) => void;
}

interface PendingPreparation {
  reject: (error: Error) => void;
  resolve: () => void;
  senderId: number;
  timeout: ReturnType<typeof setTimeout>;
}

const DEFAULT_TIMEOUT_MS = 20_000;

export class UpdateInstallPreparationCoordinator {
  private nextRequestId = 0;
  private readonly pending = new Map<number, PendingPreparation>();

  constructor(
    private readonly channel: string,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {}

  request(target: UpdatePreparationTarget): Promise<void> {
    if (target.isDestroyed()) {
      return Promise.reject(new Error('업데이트 전에 앱 데이터를 저장할 창을 찾지 못했습니다.'));
    }

    const requestId = this.nextRequestId + 1;
    this.nextRequestId = requestId;

    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        reject(
          new Error(
            '사용자 데이터 저장 응답을 기다리는 시간이 초과되었습니다.',
          ),
        );
      }, this.timeoutMs);

      this.pending.set(requestId, {
        reject,
        resolve,
        senderId: target.id,
        timeout,
      });

      try {
        target.send(this.channel, { requestId });
      } catch (error) {
        clearTimeout(timeout);
        this.pending.delete(requestId);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }

  complete(senderId: number, response: UpdatePreparationResponse): boolean {
    const pending = this.pending.get(response.requestId);
    if (!pending || pending.senderId !== senderId) {
      return false;
    }

    clearTimeout(pending.timeout);
    this.pending.delete(response.requestId);
    if (response.success) {
      pending.resolve();
    } else {
      pending.reject(
        new Error(
          response.message?.trim() ||
            '사용자 데이터를 저장하지 못했습니다.',
        ),
      );
    }
    return true;
  }

  dispose(): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('앱이 종료되어 데이터 저장 준비를 취소했습니다.'));
    }
    this.pending.clear();
  }
}
