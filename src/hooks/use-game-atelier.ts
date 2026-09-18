import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createBrowserGameAtelierDraftService,
  type GameAtelierDraft,
  type GameAtelierDraftService,
} from '../app/services/game-atelier-draft-service';
import { gameAtelierService } from '../app/services/game-atelier-service';
import { gameProjectDataService } from '../app/services/game-project-data-service';
import { updateSaveCoordinator } from '../app/services/update-save-coordinator';
import type { GameIdeationSession, GameIdeationTurn } from '../domain/game-ideation';
import type { GameAtelierDataV2 } from '../domain/game-atelier-data';
import type { GameProject } from '../domain/game-project';
import { reportApplicationError } from '../lib/report-error';

export type GameAtelierScreen = 'start' | 'conversation' | 'project';
export type GameAtelierLoadStatus = 'loading' | 'ready' | 'error';
export type GameAtelierOperation = 'idle' | 'starting' | 'answering' | 'creating';
export type GameProjectSaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface GameAtelierState {
  activeProject: GameProject | null;
  answer: string;
  cancelConversation: () => void;
  clearOperationError: () => void;
  idea: string;
  loadError: string | null;
  loadStatus: GameAtelierLoadStatus;
  operation: GameAtelierOperation;
  operationError: string | null;
  projects: readonly GameProject[];
  retryCreateProject: () => void;
  retryLoad: () => void;
  retrySave: () => void;
  saveError: string | null;
  saveState: GameProjectSaveState;
  screen: GameAtelierScreen;
  selectProject: (project: GameProject) => void;
  setAnswer: (answer: string) => void;
  setIdea: (idea: string) => void;
  startConversation: () => void;
  startNewProject: () => void;
  submitAnswer: () => void;
  turn: GameIdeationTurn | null;
}

interface DraftLoadResult {
  draft: GameAtelierDraft | null;
  error: unknown | null;
}

interface AtelierDraftSnapshot {
  answer: string;
  idea: string;
  screen: GameAtelierScreen;
  turn: GameIdeationTurn | null;
}

function messageFrom(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function mergeWithBuiltInProjects(data: GameAtelierDataV2): GameProject[] {
  const storedById = new Map(data.projects.map((project) => [project.id, project]));
  const merged = gameAtelierService
    .getBuiltInProjects()
    .map((project) => storedById.get(project.id) ?? project);
  const builtInIds = new Set(merged.map((project) => project.id));
  return [...merged, ...data.projects.filter((project) => !builtInIds.has(project.id))];
}

export function useGameAtelier(): GameAtelierState {
  const draftServiceRef = useRef<GameAtelierDraftService | null>(null);
  if (draftServiceRef.current === null) {
    draftServiceRef.current = createBrowserGameAtelierDraftService();
  }
  const draftService = draftServiceRef.current;

  const initialDraftResultRef = useRef<DraftLoadResult | null>(null);
  if (initialDraftResultRef.current === null) {
    try {
      initialDraftResultRef.current = { draft: draftService.load(), error: null };
    } catch (error: unknown) {
      initialDraftResultRef.current = { draft: null, error };
    }
  }
  const initialDraft = initialDraftResultRef.current.draft;

  const [loadStatus, setLoadStatus] = useState<GameAtelierLoadStatus>('loading');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadRevision, setLoadRevision] = useState(0);
  const [projects, setProjects] = useState<readonly GameProject[]>(() =>
    gameAtelierService.getBuiltInProjects(),
  );
  const [storedProjectIds, setStoredProjectIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const [activeProject, setActiveProject] = useState<GameProject | null>(null);
  const [screen, setScreen] = useState<GameAtelierScreen>(
    initialDraft?.screen ?? 'start',
  );
  const [idea, setIdea] = useState(initialDraft?.idea ?? '');
  const [answer, setAnswer] = useState(initialDraft?.answer ?? '');
  const [turn, setTurn] = useState<GameIdeationTurn | null>(
    initialDraft?.turn ?? null,
  );
  const [operation, setOperation] = useState<GameAtelierOperation>('idle');
  const [operationError, setOperationError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<GameProjectSaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const operationTokenRef = useRef(0);
  const activeProjectRef = useRef<GameProject | null>(activeProject);
  activeProjectRef.current = activeProject;
  const draftSnapshotRef = useRef<AtelierDraftSnapshot>({
    answer,
    idea,
    screen,
    turn,
  });
  draftSnapshotRef.current = { answer, idea, screen, turn };

  const flushDraft = useCallback((): void => {
    const snapshot = draftSnapshotRef.current;
    if (snapshot.screen === 'project') {
      draftService.clear();
      return;
    }
    draftService.save({
      screen: snapshot.screen,
      idea: snapshot.idea,
      answer: snapshot.screen === 'conversation' ? snapshot.answer : '',
      turn: snapshot.screen === 'conversation' ? snapshot.turn : null,
    });
  }, [draftService]);

  const flushActiveProject = useCallback(async (): Promise<void> => {
    const project = activeProjectRef.current;
    if (!project || project.id === 'midnight-archive') {
      return;
    }
    await gameProjectDataService.save(project);
  }, []);

  const clearDraft = useCallback((): void => {
    try {
      draftService.clear();
    } catch (error: unknown) {
      reportApplicationError(error);
    }
  }, [draftService]);

  useEffect(() => {
    if (initialDraftResultRef.current?.error) {
      reportApplicationError(initialDraftResultRef.current.error);
    }
    const unregisterDraft = updateSaveCoordinator.register(
      'game-atelier-draft',
      '미완료 게임 기획',
      flushDraft,
    );
    const unregisterProject = updateSaveCoordinator.register(
      'game-atelier-active-project',
      '게임 프로젝트',
      flushActiveProject,
    );
    return () => {
      unregisterDraft();
      unregisterProject();
    };
  }, [flushActiveProject, flushDraft]);

  useEffect(() => {
    let active = true;
    setLoadStatus('loading');
    setLoadError(null);

    gameProjectDataService
      .load()
      .then((data) => {
        if (!active) {
          return;
        }
        const merged = mergeWithBuiltInProjects(data);
        setProjects(merged);
        setStoredProjectIds(new Set(data.projects.map((project) => project.id)));

        if (initialDraft) {
          activeProjectRef.current = null;
          setActiveProject(null);
          setScreen(initialDraft.screen);
          setIdea(initialDraft.idea);
          setAnswer(initialDraft.answer);
          setTurn(initialDraft.turn);
          setSaveState('idle');
        } else {
          const restored = data.lastOpenedProjectId
            ? merged.find((project) => project.id === data.lastOpenedProjectId) ?? null
            : null;
          if (restored) {
            activeProjectRef.current = restored;
            setActiveProject(restored);
            setScreen('project');
            setSaveState('saved');
          }
        }
        setLoadStatus('ready');
      })
      .catch((error: unknown) => {
        if (!active) {
          return;
        }
        reportApplicationError(error);
        setLoadError(messageFrom(error, '저장된 게임 프로젝트를 불러오지 못했습니다.'));
        setLoadStatus('error');
      });

    return () => {
      active = false;
    };
  }, [initialDraft, loadRevision]);

  const persistProject = useCallback(
    async (project: GameProject, token: number): Promise<void> => {
      if (operationTokenRef.current === token) {
        setSaveState('saving');
        setSaveError(null);
      }
      try {
        const savedData = await gameProjectDataService.save(project);
        setProjects(mergeWithBuiltInProjects(savedData));
        setStoredProjectIds(new Set(savedData.projects.map((item) => item.id)));
        const savedProject =
          savedData.projects.find((item) => item.id === project.id) ?? project;
        if (operationTokenRef.current === token) {
          activeProjectRef.current = savedProject;
          setActiveProject(savedProject);
          setSaveState('saved');
        }
      } catch (error) {
        reportApplicationError(error);
        if (operationTokenRef.current === token) {
          setSaveError(
            messageFrom(error, '게임 프로젝트를 로컬 사용자 데이터에 저장하지 못했습니다.'),
          );
          setSaveState('error');
        }
      }
    },
    [],
  );

  const createAndSaveProject = useCallback(
    async (session: GameIdeationSession, token: number): Promise<void> => {
      setOperation('creating');
      setOperationError(null);
      try {
        const project = await gameAtelierService.createGameProject(session);
        if (operationTokenRef.current !== token) {
          return;
        }
        clearDraft();
        draftSnapshotRef.current = {
          answer: '',
          idea: '',
          screen: 'project',
          turn: null,
        };
        activeProjectRef.current = project;
        setActiveProject(project);
        setScreen('project');
        setOperation('idle');
        await persistProject(project, token);
      } catch (error) {
        if (operationTokenRef.current !== token) {
          return;
        }
        reportApplicationError(error);
        setOperationError(messageFrom(error, 'Mock AI가 게임 프로젝트를 생성하지 못했습니다.'));
        setOperation('idle');
      }
    },
    [clearDraft, persistProject],
  );

  const startNewProject = useCallback((): void => {
    operationTokenRef.current += 1;
    clearDraft();
    draftSnapshotRef.current = {
      answer: '',
      idea: '',
      screen: 'start',
      turn: null,
    };
    setScreen('start');
    activeProjectRef.current = null;
    setActiveProject(null);
    setIdea('');
    setAnswer('');
    setTurn(null);
    setOperation('idle');
    setOperationError(null);
    setSaveState('idle');
    setSaveError(null);
  }, [clearDraft]);

  const startConversation = useCallback((): void => {
    if (idea.trim().length === 0 || operation !== 'idle') {
      return;
    }
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    setOperation('starting');
    setOperationError(null);

    void gameAtelierService
      .startGameIdeation(idea)
      .then((nextTurn) => {
        if (operationTokenRef.current !== token) {
          return;
        }
        draftSnapshotRef.current = {
          answer: '',
          idea: nextTurn.session.initialIdea,
          screen: 'conversation',
          turn: nextTurn,
        };
        setTurn(nextTurn);
        setScreen('conversation');
        setOperation('idle');
      })
      .catch((error: unknown) => {
        if (operationTokenRef.current !== token) {
          return;
        }
        reportApplicationError(error);
        setOperationError(messageFrom(error, 'Mock AI 기획 대화를 시작하지 못했습니다.'));
        setOperation('idle');
      });
  }, [idea, operation]);

  const submitAnswer = useCallback((): void => {
    if (!turn?.question || answer.trim().length === 0 || operation !== 'idle') {
      return;
    }
    const token = operationTokenRef.current + 1;
    operationTokenRef.current = token;
    setOperation('answering');
    setOperationError(null);

    void gameAtelierService
      .answerQuestion(turn.session, answer)
      .then(async (nextTurn) => {
        if (operationTokenRef.current !== token) {
          return;
        }
        draftSnapshotRef.current = {
          answer: '',
          idea: nextTurn.session.initialIdea,
          screen: 'conversation',
          turn: nextTurn,
        };
        setTurn(nextTurn);
        setAnswer('');
        if (nextTurn.isComplete) {
          await createAndSaveProject(nextTurn.session, token);
        } else {
          setOperation('idle');
        }
      })
      .catch((error: unknown) => {
        if (operationTokenRef.current !== token) {
          return;
        }
        reportApplicationError(error);
        setOperationError(messageFrom(error, 'Mock AI가 답변을 기록하지 못했습니다.'));
        setOperation('idle');
      });
  }, [answer, createAndSaveProject, operation, turn]);

  const updateAnswer = useCallback((nextAnswer: string): void => {
    draftSnapshotRef.current = {
      ...draftSnapshotRef.current,
      answer: nextAnswer,
    };
    setAnswer(nextAnswer);
  }, []);

  const updateIdea = useCallback((nextIdea: string): void => {
    draftSnapshotRef.current = {
      ...draftSnapshotRef.current,
      idea: nextIdea,
    };
    setIdea(nextIdea);
  }, []);

  return {
    activeProject,
    answer,
    cancelConversation: startNewProject,
    clearOperationError: () => setOperationError(null),
    idea,
    loadError,
    loadStatus,
    operation,
    operationError,
    projects,
    retryCreateProject: () => {
      if (turn?.isComplete) {
        const token = operationTokenRef.current + 1;
        operationTokenRef.current = token;
        void createAndSaveProject(turn.session, token);
      }
    },
    retryLoad: () => setLoadRevision((current) => current + 1),
    retrySave: () => {
      if (activeProject) {
        const token = operationTokenRef.current + 1;
        operationTokenRef.current = token;
        void persistProject(activeProject, token);
      }
    },
    saveError,
    saveState,
    screen,
    selectProject: (project) => {
      operationTokenRef.current += 1;
      clearDraft();
      draftSnapshotRef.current = {
        answer: '',
        idea: '',
        screen: 'project',
        turn: null,
      };
      activeProjectRef.current = project;
      setActiveProject(project);
      setScreen('project');
      setOperation('idle');
      setOperationError(null);
      setSaveError(null);
      setSaveState(storedProjectIds.has(project.id) ? 'saved' : 'idle');
    },
    setAnswer: updateAnswer,
    setIdea: updateIdea,
    startConversation,
    startNewProject,
    submitAnswer,
    turn,
  };
}
