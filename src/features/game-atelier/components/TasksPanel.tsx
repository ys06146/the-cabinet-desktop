import type {
  GameTask,
  GameTaskDifficulty,
  GameTaskStatus,
} from '../../../domain/game-project-workspace';

interface TasksPanelProps {
  onChange: (tasks: GameTask[]) => void;
  tasks: readonly GameTask[];
}

const STATUS_LABELS: Record<GameTaskStatus, string> = {
  todo: '대기',
  'in-progress': '진행 중',
  done: '완료',
};

const DIFFICULTY_LABELS: Record<GameTaskDifficulty, string> = {
  easy: '쉬움',
  medium: '보통',
  hard: '어려움',
};

export function TasksPanel({ onChange, tasks }: TasksPanelProps): React.JSX.Element {
  const updateTask = (taskId: string, updater: (task: GameTask) => GameTask): void => {
    onChange(tasks.map((task) => (task.id === taskId ? updater(task) : task)));
  };
  const completedCount = tasks.filter(({ completed }) => completed).length;

  return (
    <section aria-labelledby="tasks-panel-title" className="border border-cabinet-border bg-cabinet-surface/30">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-cabinet-border bg-cabinet-elevated px-4 py-4 sm:px-5">
        <div>
          <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-cabinet-brass">Implementation Ledger</p>
          <h3 className="mt-1 font-serif text-2xl text-cabinet-text" id="tasks-panel-title">Tasks</h3>
        </div>
        <p className="font-mono text-sm tabular-nums text-cabinet-muted">완료 {completedCount} / {tasks.length}</p>
      </header>

      <ol className="divide-y divide-cabinet-border">
        {tasks.map((task) => (
          <li className="grid min-w-0 gap-4 p-4 lg:grid-cols-[4rem_minmax(12rem,1.2fr)_minmax(8rem,0.7fr)_minmax(12rem,1fr)_auto] lg:items-center" key={task.id}>
            <div>
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.14em] text-cabinet-muted">구현 순서</p>
              <p className="mt-1 font-mono text-xl tabular-nums text-cabinet-brass">{String(task.implementationOrder).padStart(2, '0')}</p>
            </div>
            <div className="min-w-0">
              <p className={`break-words text-sm font-semibold ${task.completed ? 'text-cabinet-muted line-through' : 'text-cabinet-text'}`}>{task.title}</p>
              <p className="mt-2 break-all font-mono text-[0.65rem] leading-5 text-cabinet-muted">
                관련 Scene · {task.relatedScene ?? '없음'}
              </p>
              <p className="break-all font-mono text-[0.65rem] leading-5 text-cabinet-muted">
                관련 Script · {task.relatedScript ?? '없음'}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
              <label className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-cabinet-muted">
                상태
                <select
                  className="mt-1 min-h-10 w-full border border-cabinet-border bg-cabinet-background px-2 text-xs normal-case tracking-normal text-cabinet-text"
                  onChange={(event) => {
                    const status = event.target.value as GameTaskStatus;
                    updateTask(task.id, (current) => ({
                      ...current,
                      status,
                      completed: status === 'done',
                    }));
                  }}
                  value={task.status}
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className="text-[0.6rem] font-bold uppercase tracking-[0.12em] text-cabinet-muted">
                난이도
                <select
                  className="mt-1 min-h-10 w-full border border-cabinet-border bg-cabinet-background px-2 text-xs normal-case tracking-normal text-cabinet-text"
                  onChange={(event) => updateTask(task.id, (current) => ({ ...current, difficulty: event.target.value as GameTaskDifficulty }))}
                  value={task.difficulty}
                >
                  {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>
            <div className="text-xs text-cabinet-muted">
              <span className="font-bold text-cabinet-text">상태</span> {STATUS_LABELS[task.status]}<br />
              <span className="font-bold text-cabinet-text">난이도</span> {DIFFICULTY_LABELS[task.difficulty]}
            </div>
            <label className="flex min-h-11 items-center gap-2 border border-cabinet-border px-3 text-xs font-bold text-cabinet-text hover:border-cabinet-brass">
              <input
                checked={task.completed}
                className="h-4 w-4 accent-cabinet-accent"
                onChange={(event) => {
                  const completed = event.target.checked;
                  updateTask(task.id, (current) => ({
                    ...current,
                    completed,
                    status: completed ? 'done' : 'todo',
                  }));
                }}
                type="checkbox"
              />
              완료 체크
            </label>
          </li>
        ))}
      </ol>
    </section>
  );
}
