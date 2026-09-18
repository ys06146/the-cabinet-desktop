import type { GameProject, GameProjectCompletionStatus } from '../../../domain/game-project';

const COMPLETION_LABELS: Record<GameProjectCompletionStatus, string> = {
  concept: '아이디어 정리',
  'design-draft': '기획 초안',
  'prototype-ready': '프로토타입 준비',
};

interface ProjectTextFieldProps {
  label: string;
  prominent?: boolean;
  value: string;
}

function ProjectTextField({ label, prominent = false, value }: ProjectTextFieldProps): React.JSX.Element {
  return (
    <div
      className={`border-t px-3 py-4 sm:px-4 ${
        prominent
          ? 'border-cabinet-brass bg-cabinet-elevated/65'
          : 'border-cabinet-border bg-cabinet-surface/30'
      }`}
    >
      <dt className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-cabinet-muted">
        {label}
      </dt>
      <dd className={`mt-2 break-words leading-6 text-cabinet-text ${prominent ? 'font-serif text-xl' : 'text-sm'}`}>
        {value}
      </dd>
    </div>
  );
}

interface ProjectListFieldProps {
  items: readonly string[];
  label: string;
}

function ProjectListField({ items, label }: ProjectListFieldProps): React.JSX.Element {
  return (
    <section className="border-t border-cabinet-border bg-cabinet-surface/30 px-3 py-4 sm:px-4">
      <h4 className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-cabinet-muted">
        {label}
      </h4>
      <ol className="mt-3 space-y-2">
        {items.map((item, index) => (
          <li className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 text-sm leading-6 text-cabinet-text" key={item}>
            <span aria-hidden="true" className="font-mono text-xs tabular-nums text-cabinet-brass">
              {(index + 1).toString().padStart(2, '0')}
            </span>
            <span className="min-w-0 break-words">{item}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

interface GameProjectViewProps {
  content?: 'all' | 'overview' | 'design';
  isBuiltIn: boolean;
  project: GameProject;
  saveError: string | null;
  saveState: 'idle' | 'saving' | 'saved' | 'error';
  showHeader?: boolean;
  onRetrySave: () => void;
}

export function GameProjectView({
  content = 'all',
  isBuiltIn,
  project,
  saveError,
  saveState,
  showHeader = true,
  onRetrySave,
}: GameProjectViewProps): React.JSX.Element {
  const { overview, design } = project;

  return (
    <article aria-labelledby="game-project-title" className="min-w-0">
      {showHeader ? <header className="border-y border-cabinet-border bg-cabinet-surface/45 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-cabinet-brass">
              Mock AI generated · Game Project
            </p>
            <h2 className="mt-2 break-words font-serif text-3xl text-cabinet-text sm:text-4xl" id="game-project-title">
              {overview.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-cabinet-muted">
              {overview.oneLineDescription}
            </p>
          </div>
          <span className="border border-cabinet-brass/60 bg-cabinet-background px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.16em] text-cabinet-brass">
            Mock AI
          </span>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-cabinet-border pt-4 text-xs text-cabinet-muted">
          <span className="break-all font-mono">{project.id}</span>
          <span>{isBuiltIn ? '앱에 포함된 기본 프로젝트' : '사용자 데이터에 로컬 저장'}</span>
          {!isBuiltIn && saveState === 'saving' ? <span role="status">저장 중…</span> : null}
          {!isBuiltIn && saveState === 'saved' ? (
            <span className="text-cabinet-positive" role="status">
              저장됨 · 재실행 후 복원 가능
            </span>
          ) : null}
          {!isBuiltIn && saveState === 'error' ? (
            <button
              className="min-h-9 border border-cabinet-negative px-3 text-cabinet-negative hover:bg-cabinet-negative/10"
              onClick={onRetrySave}
              type="button"
            >
              저장 다시 시도
            </button>
          ) : null}
        </div>
        {saveError ? (
          <p className="mt-3 border-l-2 border-cabinet-negative bg-cabinet-negative/5 px-3 py-2 text-xs leading-5 text-cabinet-negative" role="alert">
            {saveError}
          </p>
        ) : null}
      </header> : null}

      <section aria-labelledby="project-overview-title" className="mt-6 border border-cabinet-border" hidden={content === 'design'}>
        <div className="bg-cabinet-elevated px-4 py-4 sm:px-5">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-cabinet-brass">
            Project Overview
          </p>
          <h3 className="mt-1 font-serif text-2xl text-cabinet-text" id="project-overview-title">
            프로젝트 개요
          </h3>
        </div>
        <dl className="grid min-w-0 sm:grid-cols-2">
          <ProjectTextField label="게임 제목" prominent value={overview.title} />
          <ProjectTextField label="한 줄 설명" prominent value={overview.oneLineDescription} />
          <ProjectTextField label="장르" value={overview.genre} />
          <ProjectTextField label="핵심 행동" value={overview.coreAction} />
          <ProjectTextField label="승리 조건" value={overview.winCondition} />
          <ProjectTextField label="실패 조건" value={overview.failureCondition} />
          <ProjectTextField label="예상 플레이 시간" value={`${overview.estimatedPlayTimeMinutes}분`} />
          <ProjectTextField label="현재 완성도" value={COMPLETION_LABELS[overview.completionStatus]} />
          <div className="sm:col-span-2">
            <ProjectTextField label="다음 작업" prominent value={overview.nextTask} />
          </div>
        </dl>
      </section>

      <section aria-labelledby="game-design-title" className="mt-6 border border-cabinet-border" hidden={content === 'overview'}>
        <div className="bg-cabinet-elevated px-4 py-4 sm:px-5">
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-cabinet-brass">
            Game Design
          </p>
          <h3 className="mt-1 font-serif text-2xl text-cabinet-text" id="game-design-title">
            게임 설계
          </h3>
        </div>
        <div className="grid min-w-0 lg:grid-cols-2">
          <ProjectTextField label="게임 목표" prominent value={design.objective} />
          <ProjectListField items={design.gameplayLoop} label="플레이 흐름" />
          <ProjectListField items={design.coreRules} label="핵심 규칙" />
          <ProjectListField items={design.controls} label="조작" />
          <ProjectTextField label="난이도 변화" value={design.difficultyProgression} />
          <ProjectTextField label="점수 체계" value={design.scoringSystem} />
          <ProjectListField items={design.endConditions} label="종료 조건" />
          <ProjectListField items={design.minimumViableFeatures} label="최소 기능 버전" />
          <div className="lg:col-span-2">
            <ProjectListField items={design.futureFeatures} label="나중에 추가할 기능" />
          </div>
        </div>
      </section>
    </article>
  );
}
