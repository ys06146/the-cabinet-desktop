import type {
  UpdateCheckTrigger,
  UpdateState,
} from '../shared/update';

const UNKNOWN_VERSION = '알 수 없음';
const GENERIC_UPDATE_ERROR =
  '업데이트를 확인하거나 내려받는 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';

export type UpdateStateEvent =
  | {
      type: 'CHECK_REQUESTED';
      requestId: number;
      trigger: UpdateCheckTrigger;
    }
  | { type: 'UPDATE_AVAILABLE'; requestId: number; version: string }
  | { type: 'UPDATE_NOT_AVAILABLE'; requestId: number }
  | { type: 'DOWNLOAD_STARTED'; requestId: number }
  | { type: 'DOWNLOAD_PROGRESS'; requestId: number; percent: number }
  | { type: 'UPDATE_DOWNLOADED'; requestId: number; version: string }
  | { type: 'FAILED'; requestId: number; message: string }
  | { type: 'RESET' };

function normalizeVersion(version: string): string {
  return version.trim() || UNKNOWN_VERSION;
}

function isValidRequestId(requestId: number): boolean {
  return Number.isSafeInteger(requestId) && requestId > 0;
}

function isCurrentRequest(state: UpdateState, requestId: number): boolean {
  return isValidRequestId(requestId) && state.requestId === requestId;
}

function canBeginCheck(state: UpdateState): boolean {
  return (
    state.status === 'idle' ||
    state.status === 'up-to-date' ||
    state.status === 'error'
  );
}

export function createInitialUpdateState(currentVersion: string): UpdateState {
  return {
    status: 'idle',
    currentVersion: normalizeVersion(currentVersion),
    availableVersion: null,
    progressPercent: null,
    errorMessage: null,
    requestId: null,
    checkTrigger: null,
  };
}

/**
 * electron-updater 이벤트를 UI 상태로 바꾸는 순수 상태 머신이다.
 * 허용되지 않은 순서와 이전 요청에서 늦게 도착한 이벤트는 현재 상태를 그대로 반환한다.
 */
export function reduceUpdateState(
  state: UpdateState,
  event: UpdateStateEvent,
): UpdateState {
  if (event.type === 'RESET') {
    return {
      ...createInitialUpdateState(state.currentVersion),
      requestId: state.requestId,
    };
  }

  if (event.type === 'CHECK_REQUESTED') {
    const lastRequestId = state.requestId ?? 0;
    if (
      !canBeginCheck(state) ||
      !isValidRequestId(event.requestId) ||
      event.requestId <= lastRequestId
    ) {
      return state;
    }

    return {
      ...state,
      status: 'checking',
      availableVersion: null,
      progressPercent: null,
      errorMessage: null,
      requestId: event.requestId,
      checkTrigger: event.trigger,
    };
  }

  if (!isCurrentRequest(state, event.requestId)) {
    return state;
  }

  switch (event.type) {
    case 'UPDATE_AVAILABLE': {
      const version = event.version.trim();
      if (state.status !== 'checking' || !version) {
        return state;
      }

      return {
        ...state,
        status: 'available',
        availableVersion: version,
        progressPercent: null,
        errorMessage: null,
      };
    }

    case 'UPDATE_NOT_AVAILABLE':
      if (state.status !== 'checking') {
        return state;
      }

      return {
        ...state,
        status: 'up-to-date',
        availableVersion: null,
        progressPercent: null,
        errorMessage: null,
      };

    case 'DOWNLOAD_STARTED':
      if (state.status !== 'available') {
        return state;
      }

      return {
        ...state,
        status: 'downloading',
        progressPercent: 0,
        errorMessage: null,
      };

    case 'DOWNLOAD_PROGRESS': {
      if (state.status !== 'downloading' || !Number.isFinite(event.percent)) {
        return state;
      }

      const progressPercent = Math.min(100, Math.max(0, event.percent));
      if (
        state.progressPercent !== null &&
        progressPercent < state.progressPercent
      ) {
        return state;
      }

      return { ...state, progressPercent };
    }

    case 'UPDATE_DOWNLOADED': {
      const version = event.version.trim();
      if (
        state.status !== 'downloading' ||
        !version ||
        version !== state.availableVersion
      ) {
        return state;
      }

      return {
        ...state,
        status: 'downloaded',
        progressPercent: 100,
        errorMessage: null,
      };
    }

    case 'FAILED': {
      if (
        state.status !== 'checking' &&
        state.status !== 'available' &&
        state.status !== 'downloading'
      ) {
        return state;
      }

      return {
        ...state,
        status: 'error',
        errorMessage: event.message.trim() || GENERIC_UPDATE_ERROR,
      };
    }
  }
}

export function toUserFriendlyUpdateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalizedMessage = message.toLowerCase();

  if (
    /enotfound|econnrefused|econnreset|etimedout|network|internet|dns/.test(
      normalizedMessage,
    )
  ) {
    return '업데이트 서버에 연결하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.';
  }

  if (/404|latest\.yml|no published versions|release not found/.test(normalizedMessage)) {
    return '공개된 업데이트 정보를 찾지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }

  if (/eacces|eperm|permission|access denied/.test(normalizedMessage)) {
    return '업데이트 파일을 저장할 수 없습니다. 앱을 다시 실행한 뒤 시도해 주세요.';
  }

  if (/signature|checksum|sha512|integrity/.test(normalizedMessage)) {
    return '업데이트 파일을 안전하게 확인하지 못해 설치를 중단했습니다.';
  }

  return GENERIC_UPDATE_ERROR;
}
