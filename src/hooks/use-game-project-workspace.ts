import { useCallback, useEffect, useRef, useState } from 'react';
import { gameProjectDataService } from '../app/services/game-project-data-service';
import { updateSaveCoordinator } from '../app/services/update-save-coordinator';
import {
  createDefaultGameProjectWorkspace,
  type GameProjectWorkspace,
} from '../domain/game-project-workspace';
import { reportApplicationError } from '../lib/report-error';

export type WorkspaceLoadState = 'loading' | 'ready' | 'error';
export type WorkspaceSaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface GameProjectWorkspaceState {
  loadError: string | null;
  loadState: WorkspaceLoadState;
  retryLoad: () => void;
  retrySave: () => void;
  saveError: string | null;
  saveState: WorkspaceSaveState;
  updateWorkspace: (workspace: GameProjectWorkspace) => void;
  workspace: GameProjectWorkspace | null;
}

interface PendingWorkspaceSave {
  projectId: string;
  revision: number;
  workspace: GameProjectWorkspace;
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function pendingSaveKey(pending: PendingWorkspaceSave): string {
  return `${pending.projectId}:${pending.revision}`;
}

export function useGameProjectWorkspace(projectId: string): GameProjectWorkspaceState {
  const [workspace, setWorkspace] = useState<GameProjectWorkspace | null>(null);
  const [loadState, setLoadState] = useState<WorkspaceLoadState>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadRevision, setLoadRevision] = useState(0);
  const [saveState, setSaveState] = useState<WorkspaceSaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const saveRevisionRef = useRef(0);
  const pendingSaveRef = useRef<PendingWorkspaceSave | null>(null);
  const inFlightSavesRef = useRef(new Map<string, Promise<void>>());
  const activeProjectIdRef = useRef(projectId);
  const mountedRef = useRef(true);

  const persistWorkspace = useCallback(
    (pending: PendingWorkspaceSave): Promise<void> => {
      const key = pendingSaveKey(pending);
      const existing = inFlightSavesRef.current.get(key);
      if (existing) {
        return existing;
      }

      const operation = gameProjectDataService.saveWorkspace(
        pending.projectId,
        pending.workspace,
      )
        .then((savedData) => {
          const latestPending = pendingSaveRef.current;
          if (
            latestPending?.projectId === pending.projectId &&
            latestPending.revision === pending.revision
          ) {
            pendingSaveRef.current = null;
          }
          if (
            mountedRef.current &&
            activeProjectIdRef.current === pending.projectId &&
            saveRevisionRef.current === pending.revision
          ) {
            setWorkspace(
              savedData.projectWorkspaces[pending.projectId] ?? pending.workspace,
            );
            setSaveState('saved');
            setSaveError(null);
          }
        })
        .catch((error: unknown) => {
          reportApplicationError(error);
          if (
            mountedRef.current &&
            activeProjectIdRef.current === pending.projectId &&
            saveRevisionRef.current === pending.revision
          ) {
            setSaveState('error');
            setSaveError(
              messageFrom(
                error,
                '프로젝트 제작 화면을 사용자 데이터에 저장하지 못했습니다.',
              ),
            );
          }
          throw error;
        });

      inFlightSavesRef.current.set(key, operation);
      void operation
        .finally(() => {
          if (inFlightSavesRef.current.get(key) === operation) {
            inFlightSavesRef.current.delete(key);
          }
        })
        .catch(() => undefined);
      return operation;
    },
    [],
  );

  const flushPendingWorkspace = useCallback(
    async (
      capturedPending: PendingWorkspaceSave | null = null,
      requireStableCurrent = true,
    ): Promise<void> => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const pending = capturedPending ?? pendingSaveRef.current;
      if (!pending) {
        return;
      }
      await persistWorkspace(pending);
      if (
        requireStableCurrent &&
        pendingSaveRef.current !== null &&
        pendingSaveRef.current.revision !== pending.revision
      ) {
        throw new Error('저장 중 프로젝트 제작 화면이 변경되었습니다.');
      }
    },
    [persistWorkspace],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let cleanupPending: PendingWorkspaceSave | null = null;
    const unregister = updateSaveCoordinator.register(
      `game-project-workspace:${projectId}`,
      '게임 프로젝트 제작 화면',
      () =>
        flushPendingWorkspace(
          cleanupPending,
          cleanupPending === null,
        ),
    );

    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      const pending = pendingSaveRef.current;
      cleanupPending = pending?.projectId === projectId ? pending : null;
      unregister();
    };
  }, [flushPendingWorkspace, projectId]);

  useEffect(() => {
    activeProjectIdRef.current = projectId;
    let active = true;
    setWorkspace(null);
    setLoadState('loading');
    setLoadError(null);
    setSaveError(null);
    setSaveState('idle');

    void gameProjectDataService
      .loadWorkspace(projectId)
      .then((storedWorkspace) => {
        if (!active) return;
        setWorkspace(
          storedWorkspace ?? createDefaultGameProjectWorkspace(projectId),
        );
        setLoadState('ready');
      })
      .catch((error: unknown) => {
        if (!active) return;
        reportApplicationError(error);
        setLoadError(
          messageFrom(error, '저장된 프로젝트 제작 화면을 불러오지 못했습니다.'),
        );
        setLoadState('error');
      });

    return () => {
      active = false;
    };
  }, [loadRevision, projectId]);

  const updateWorkspace = useCallback(
    (nextWorkspace: GameProjectWorkspace): void => {
      if (loadState !== 'ready' || activeProjectIdRef.current !== projectId) {
        return;
      }
      const revision = saveRevisionRef.current + 1;
      saveRevisionRef.current = revision;
      const pending = { projectId, revision, workspace: nextWorkspace };
      pendingSaveRef.current = pending;
      setWorkspace(nextWorkspace);
      setSaveState('saving');
      setSaveError(null);
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        saveTimerRef.current = null;
        void persistWorkspace(pending).catch(() => undefined);
      }, 180);
    },
    [loadState, persistWorkspace, projectId],
  );

  const retrySave = useCallback((): void => {
    const pending = pendingSaveRef.current;
    if (!pending || pending.projectId !== projectId) return;
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setSaveState('saving');
    setSaveError(null);
    void persistWorkspace(pending).catch(() => undefined);
  }, [persistWorkspace, projectId]);

  return {
    loadError,
    loadState,
    retryLoad: () => setLoadRevision((current) => current + 1),
    retrySave,
    saveError,
    saveState,
    updateWorkspace,
    workspace,
  };
}
