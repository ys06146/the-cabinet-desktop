import type { GameProject } from '../../../domain/game-project';

interface GameProjectShelfProps {
  activeProjectId: string | null;
  onCreateNew: () => void;
  onSelectProject: (project: GameProject) => void;
  projects: readonly GameProject[];
}

export function GameProjectShelf({
  activeProjectId,
  onCreateNew,
  onSelectProject,
  projects,
}: GameProjectShelfProps): React.JSX.Element {
  return (
    <aside aria-labelledby="game-project-shelf-title" className="border border-cabinet-border bg-cabinet-surface/45">
      <div className="border-b border-cabinet-border px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.2em] text-cabinet-brass">
              Local project shelf
            </p>
            <h2 className="mt-1 font-serif text-xl text-cabinet-text" id="game-project-shelf-title">
              Game Projects
            </h2>
          </div>
          <span className="font-mono text-xs tabular-nums text-cabinet-muted">
            {projects.length.toString().padStart(2, '0')}
          </span>
        </div>
      </div>

      <div className="divide-y divide-cabinet-border">
        {projects.map((project) => {
          const active = project.id === activeProjectId;
          const isDefault = project.id === 'midnight-archive';
          return (
            <button
              aria-current={active ? 'page' : undefined}
              className={`min-h-20 w-full border-l-2 px-4 py-3 text-left ${
                active
                  ? 'border-l-cabinet-brass bg-cabinet-elevated'
                  : 'border-l-transparent bg-transparent hover:bg-cabinet-elevated/55'
              }`}
              key={project.id}
              onClick={() => onSelectProject(project)}
              type="button"
            >
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 break-words font-serif text-base text-cabinet-text">
                  {project.overview.title}
                </span>
                {isDefault ? (
                  <span className="border border-cabinet-brass/50 px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.12em] text-cabinet-brass">
                    기본 프로젝트
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block text-[0.68rem] leading-5 text-cabinet-muted">
                {project.overview.genre} · {project.overview.estimatedPlayTimeMinutes}분
              </span>
            </button>
          );
        })}
      </div>

      <div className="border-t border-cabinet-border p-3">
        <button
          className="min-h-11 w-full rounded-cabinet-sm border border-cabinet-brass bg-cabinet-accent px-3 text-xs font-bold text-cabinet-text hover:bg-cabinet-accent/80"
          onClick={onCreateNew}
          type="button"
        >
          새 게임 기획하기
        </button>
      </div>
    </aside>
  );
}
