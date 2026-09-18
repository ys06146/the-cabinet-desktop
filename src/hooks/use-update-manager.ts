import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  UpdateInstallResult,
  UpdateState,
} from '../../electron/shared/update';
import { updateService } from '../app/services/update-service';
import { reportApplicationError } from '../lib/report-error';

export type UpdatePendingAction = 'check' | 'download' | 'install' | null;

export interface UpdateManagerResult {
  actionError: string | null;
  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installOutcome: Exclude<UpdateInstallResult['status'], 'blocked'> | null;
  installUpdate: () => Promise<void>;
  loading: boolean;
  pendingAction: UpdatePendingAction;
  state: UpdateState | null;
}

const actionFailureMessages: Record<Exclude<UpdatePendingAction, null>, string> = {
  check: '업데이트를 확인하지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
  download: '업데이트를 다운로드하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  install:
    '업데이트 설치를 시작하지 못했습니다. 작성 중인 내용의 저장 상태를 확인한 뒤 다시 시도해 주세요.',
};

export function useUpdateManager(): UpdateManagerResult {
  const [state, setState] = useState<UpdateState | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAction, setPendingAction] = useState<UpdatePendingAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [installOutcome, setInstallOutcome] = useState<
    Exclude<UpdateInstallResult['status'], 'blocked'> | null
  >(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let receivedLiveState = false;
    let unsubscribe = (): void => undefined;

    try {
      unsubscribe = updateService.subscribe((nextState) => {
        if (!mountedRef.current) {
          return;
        }
        receivedLiveState = true;
        setState(nextState);
        setActionError(null);
        if (nextState.status !== 'downloaded') {
          setInstallOutcome(null);
        }
        setLoading(false);
      });
    } catch (error: unknown) {
      reportApplicationError(error);
      setActionError('업데이트 상태 알림을 연결하지 못했습니다. 설정 화면을 다시 열어 주세요.');
    }

    void updateService
      .getState()
      .then((initialState) => {
        if (mountedRef.current && !receivedLiveState) {
          setState(initialState);
        }
      })
      .catch((error: unknown) => {
        reportApplicationError(error);
        if (mountedRef.current) {
          setActionError('업데이트 상태를 불러오지 못했습니다. 설정 화면을 다시 열어 주세요.');
        }
      })
      .finally(() => {
        if (mountedRef.current) {
          setLoading(false);
        }
      });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, []);

  const runStateAction = useCallback(
    async (
      action: Exclude<UpdatePendingAction, 'install' | null>,
      operation: () => Promise<UpdateState>,
    ): Promise<void> => {
      setPendingAction(action);
      setActionError(null);
      try {
        const nextState = await operation();
        if (mountedRef.current) {
          setState(nextState);
        }
      } catch (error: unknown) {
        reportApplicationError(error);
        if (mountedRef.current) {
          setActionError(actionFailureMessages[action]);
        }
      } finally {
        if (mountedRef.current) {
          setPendingAction(null);
        }
      }
    },
    [],
  );

  const checkForUpdates = useCallback(
    () => runStateAction('check', () => updateService.checkForUpdates()),
    [runStateAction],
  );

  const downloadUpdate = useCallback(
    () => runStateAction('download', () => updateService.downloadUpdate()),
    [runStateAction],
  );

  const installUpdate = useCallback(async (): Promise<void> => {
    setPendingAction('install');
    setActionError(null);
    setInstallOutcome(null);
    try {
      const result = await updateService.installUpdate();
      if (!mountedRef.current) {
        return;
      }
      if (result.status === 'blocked') {
        setActionError(result.message);
      } else {
        setInstallOutcome(result.status);
      }
    } catch (error: unknown) {
      reportApplicationError(error);
      if (mountedRef.current) {
        setActionError(actionFailureMessages.install);
      }
    } finally {
      if (mountedRef.current) {
        setPendingAction(null);
      }
    }
  }, []);

  return {
    actionError,
    checkForUpdates,
    downloadUpdate,
    installOutcome,
    installUpdate,
    loading,
    pendingAction,
    state,
  };
}
