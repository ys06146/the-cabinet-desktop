import { useRef, useState, type KeyboardEvent } from 'react';
import { ErrorMessage } from '../../../components/ui/ErrorMessage';
import { LoadingSkeleton } from '../../../components/ui/LoadingSkeleton';
import type { GameProject } from '../../../domain/game-project';
import { useGameProjectWorkspace } from '../../../hooks/use-game-project-workspace';
import { AssetsPanel } from './AssetsPanel';
import { GameProjectView } from './GameProjectView';
import { PreviewPanel } from './PreviewPanel';
import { SceneEditor } from './SceneEditor';
import { ScriptsPanel } from './ScriptsPanel';
import { TasksPanel } from './TasksPanel';

const PROJECT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'game-design', label: 'Game Design' },
  { id: 'scene', label: 'Scene' },
  { id: 'scripts', label: 'Scripts' },
  { id: 'assets', label: 'Assets' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'preview', label: 'Preview' },
] as const;

type ProjectTabId = (typeof PROJECT_TABS)[number]['id'];

interface GameProjectWorkbenchProps {
  isBuiltIn: boolean;
  onRetrySave: () => void;
  project: GameProject;
  saveError: string | null;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
}

export function GameProjectWorkbench({
  isBuiltIn,
  onRetrySave,
  project,
  saveError,
  saveState,
}: GameProjectWorkbenchProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<ProjectTabId>('overview');
  const tabRefs = useRef<Partial<Record<ProjectTabId, HTMLButtonElement>>>({});
  const editor = useGameProjectWorkspace(project.id);
  const { overview } = project;

  const activateTab = (tabId: ProjectTabId, focus = false): void => {
    setActiveTab(tabId);
    if (focus) {
      requestAnimationFrame(() => tabRefs.current[tabId]?.focus());
    }
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    const currentIndex = PROJECT_TABS.findIndex(({ id }) => id === activeTab);
    let nextIndex: number | null = null;
    if (event.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % PROJECT_TABS.length;
    } else if (event.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + PROJECT_TABS.length) % PROJECT_TABS.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = PROJECT_TABS.length - 1;
    }
    if (nextIndex !== null) {
      event.preventDefault();
      activateTab(PROJECT_TABS[nextIndex].id, true);
    }
  };

  const renderWorkspaceFailure = (): React.JSX.Element => {
    if (editor.loadState === 'loading') {
      return <LoadingSkeleton label="프로젝트 제작 화면 불러오는 중" lines={7} />;
    }
    if (editor.loadState === 'error' || !editor.workspace) {
      return (
        <ErrorMessage
          message={editor.loadError ?? '프로젝트 제작 화면을 불러오지 못했습니다.'}
          onRetry={editor.retryLoad}
          retryLabel="제작 화면 다시 불러오기"
          title="프로젝트 편집 데이터를 열 수 없습니다"
        />
      );
    }
    return <></>;
  };

  return (
    <article aria-labelledby="game-project-title" className="min-w-0">
      <header className="border-y border-cabinet-border bg-cabinet-surface/45 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-cabinet-brass">
              Mock AI generated · Game Project
            </p>
            <h2 className="mt-2 break-words font-serif text-3xl text-cabinet-text sm:text-4xl" id="game-project-title">
              {overview.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-cabinet-muted">{overview.oneLineDescription}</p>
          </div>
          <span className="border border-cabinet-brass/60 bg-cabinet-background px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-cabinet-brass">
            Mock AI
          </span>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-cabinet-border pt-4 text-xs text-cabinet-muted">
          <span className="break-all font-mono">{project.id}</span>
          <span>{isBuiltIn ? '앱에 포함된 기본 프로젝트' : '사용자 데이터에 로컬 저장'}</span>
          {!isBuiltIn && saveState === 'saving' ? <span role="status">기획 저장 중…</span> : null}
          {!isBuiltIn && saveState === 'saved' ? <span className="text-cabinet-positive" role="status">기획 저장됨</span> : null}
          {editor.saveState === 'saving' ? <span role="status">제작 화면 저장 중…</span> : null}
          {editor.saveState === 'saved' ? <span className="text-cabinet-positive" role="status">제작 화면 저장됨 · 재실행 후 복원 가능</span> : null}
          {!isBuiltIn && saveState === 'error' ? (
            <button className="min-h-9 border border-cabinet-negative px-3 text-cabinet-negative hover:bg-cabinet-negative/10" onClick={onRetrySave} type="button">기획 저장 다시 시도</button>
          ) : null}
          {editor.saveState === 'error' ? (
            <button className="min-h-9 border border-cabinet-negative px-3 text-cabinet-negative hover:bg-cabinet-negative/10" onClick={editor.retrySave} type="button">제작 화면 저장 다시 시도</button>
          ) : null}
        </div>
        {saveError ? <p className="mt-3 border-l-2 border-cabinet-negative bg-cabinet-negative/5 px-3 py-2 text-xs leading-5 text-cabinet-negative" role="alert">{saveError}</p> : null}
        {editor.saveError ? <p className="mt-3 border-l-2 border-cabinet-negative bg-cabinet-negative/5 px-3 py-2 text-xs leading-5 text-cabinet-negative" role="alert">{editor.saveError}</p> : null}
      </header>

      <nav aria-label="Game Project 제작 메뉴" className="mt-5 overflow-x-auto border-y border-cabinet-border bg-cabinet-background/55">
        <div className="flex min-w-max" role="tablist" aria-orientation="horizontal">
          {PROJECT_TABS.map(({ id, label }) => (
            <button
              aria-controls={`game-project-panel-${id}`}
              aria-selected={activeTab === id}
              className={`min-h-12 border-r border-cabinet-border px-4 text-xs font-bold tracking-[0.04em] ${
                activeTab === id
                  ? 'bg-cabinet-accent text-cabinet-text shadow-[inset_0_-2px_0_rgb(var(--color-brass))]'
                  : 'text-cabinet-muted hover:bg-cabinet-elevated hover:text-cabinet-text'
              }`}
              id={`game-project-tab-${id}`}
              key={id}
              onClick={() => activateTab(id)}
              onKeyDown={handleTabKeyDown}
              ref={(node) => {
                if (node) {
                  tabRefs.current[id] = node;
                }
              }}
              role="tab"
              tabIndex={activeTab === id ? 0 : -1}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      </nav>

      <div aria-labelledby="game-project-tab-overview" id="game-project-panel-overview" role="tabpanel" hidden={activeTab !== 'overview'} tabIndex={0}>
        {activeTab === 'overview' ? (
          <GameProjectView content="overview" isBuiltIn={isBuiltIn} onRetrySave={onRetrySave} project={project} saveError={saveError} saveState={saveState} showHeader={false} />
        ) : null}
      </div>
      <div aria-labelledby="game-project-tab-game-design" id="game-project-panel-game-design" role="tabpanel" hidden={activeTab !== 'game-design'} tabIndex={0}>
        {activeTab === 'game-design' ? (
          <GameProjectView content="design" isBuiltIn={isBuiltIn} onRetrySave={onRetrySave} project={project} saveError={saveError} saveState={saveState} showHeader={false} />
        ) : null}
      </div>
      <div aria-labelledby="game-project-tab-scene" className="mt-6" id="game-project-panel-scene" role="tabpanel" hidden={activeTab !== 'scene'} tabIndex={0}>
        {editor.workspace ? (
          <SceneEditor
            onChange={(scene) => {
              if (editor.workspace) {
                editor.updateWorkspace({ ...editor.workspace, scene });
              }
            }}
            onRun={() => activateTab('preview', true)}
            scene={editor.workspace.scene}
          />
        ) : renderWorkspaceFailure()}
      </div>
      <div aria-labelledby="game-project-tab-scripts" className="mt-6" id="game-project-panel-scripts" role="tabpanel" hidden={activeTab !== 'scripts'} tabIndex={0}>
        {editor.workspace ? (
          <ScriptsPanel
            onChange={(scriptOverrides) => {
              if (editor.workspace) {
                editor.updateWorkspace({ ...editor.workspace, scriptOverrides });
              }
            }}
            scriptOverrides={editor.workspace.scriptOverrides}
          />
        ) : renderWorkspaceFailure()}
      </div>
      <div aria-labelledby="game-project-tab-assets" className="mt-6" id="game-project-panel-assets" role="tabpanel" hidden={activeTab !== 'assets'} tabIndex={0}>
        <AssetsPanel />
      </div>
      <div aria-labelledby="game-project-tab-tasks" className="mt-6" id="game-project-panel-tasks" role="tabpanel" hidden={activeTab !== 'tasks'} tabIndex={0}>
        {editor.workspace ? (
          <TasksPanel
            onChange={(tasks) => {
              if (editor.workspace) {
                editor.updateWorkspace({ ...editor.workspace, tasks });
              }
            }}
            tasks={editor.workspace.tasks}
          />
        ) : renderWorkspaceFailure()}
      </div>
      <div aria-labelledby="game-project-tab-preview" className="mt-6" id="game-project-panel-preview" role="tabpanel" hidden={activeTab !== 'preview'} tabIndex={0}>
        <PreviewPanel active={activeTab === 'preview'} projectId={project.id} />
      </div>
    </article>
  );
}
