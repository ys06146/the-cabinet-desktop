import { useEffect, useState } from 'react';
import { runtimeInfoService } from '../app/services/runtime-info-service';
import type { AppRuntimeInfo } from '../domain/runtime';
import { reportApplicationError } from '../lib/report-error';

export type RuntimeInfoStatus = 'loading' | 'ready' | 'error';

export interface RuntimeInfoResult {
  runtimeInfo: AppRuntimeInfo | null;
  status: RuntimeInfoStatus;
}

export function useRuntimeInfo(): RuntimeInfoResult {
  const [result, setResult] = useState<RuntimeInfoResult>({
    runtimeInfo: null,
    status: 'loading',
  });

  useEffect(() => {
    let active = true;

    Promise.resolve()
      .then(() => runtimeInfoService.load())
      .then((runtimeInfo) => {
        if (active) {
          setResult({ runtimeInfo, status: 'ready' });
        }
      })
      .catch((error: unknown) => {
        reportApplicationError(error);
        if (active) {
          setResult({ runtimeInfo: null, status: 'error' });
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return result;
}