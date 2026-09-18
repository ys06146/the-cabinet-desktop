import {
  GAME_IDEA_EXAMPLES,
  GAME_IDEA_TEMPLATES,
  GAME_IDEATION_LIMITS,
} from '../../../domain/game-ideation';

interface GameAtelierStartProps {
  idea: string;
  isStarting: boolean;
  onIdeaChange: (idea: string) => void;
  onStart: () => void;
}

export function GameAtelierStart({
  idea,
  isStarting,
  onIdeaChange,
  onStart,
}: GameAtelierStartProps): React.JSX.Element {
  return (
    <section
      aria-labelledby="game-atelier-start-title"
      className="border-y border-cabinet-border bg-cabinet-surface/35 px-3 py-8 sm:px-7 sm:py-12 lg:px-10"
    >
      <div className="mx-auto max-w-4xl">
        <p className="text-center text-[0.65rem] font-bold uppercase tracking-[0.24em] text-cabinet-brass">
          Mock AI · Local planning session
        </p>
        <h2
          className="mx-auto mt-3 max-w-3xl text-center font-serif text-3xl leading-tight text-cabinet-text sm:text-4xl lg:text-5xl"
          id="game-atelier-start-title"
        >
          어떤 게임을 만들어보고 싶으신가요?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-sm leading-6 text-cabinet-muted">
          실제 AI나 외부 서버를 사용하지 않습니다. 입력은 로컬의 규칙 기반 Mock AI가 다섯
          가지 질문으로 정리합니다.
        </p>

        <form
          className="mt-8"
          onSubmit={(event) => {
            event.preventDefault();
            onStart();
          }}
        >
          <label className="sr-only" htmlFor="game-idea-input">
            만들고 싶은 게임 아이디어
          </label>
          <textarea
            aria-describedby="game-idea-input-help"
            autoFocus
            className="min-h-44 w-full resize-y rounded-cabinet-md border border-cabinet-border bg-cabinet-background/75 px-4 py-4 text-base leading-7 text-cabinet-text placeholder:text-cabinet-muted/70 hover:border-cabinet-brass/70 sm:px-5 sm:text-lg"
            id="game-idea-input"
            maxLength={GAME_IDEATION_LIMITS.maxInitialIdeaCharacters}
            onChange={(event) => onIdeaChange(event.target.value)}
            placeholder="한 문장으로 시작해도 좋습니다. 배경, 플레이어의 행동, 분위기를 자유롭게 적어보세요."
            value={idea}
          />
          <div
            className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-cabinet-muted"
            id="game-idea-input-help"
          >
            <span>프로젝트가 생성되기 전까지 로컬 파일에 저장되지 않습니다.</span>
            <span className="font-mono tabular-nums">
              {idea.length}/{GAME_IDEATION_LIMITS.maxInitialIdeaCharacters}
            </span>
          </div>

          <fieldset className="mt-7">
            <legend className="text-xs font-bold uppercase tracking-[0.16em] text-cabinet-muted">
              시작 템플릿
            </legend>
            <div className="mt-3 grid gap-px bg-cabinet-border sm:grid-cols-2 lg:grid-cols-5">
              {GAME_IDEA_TEMPLATES.map((template) => (
                <button
                  className="min-h-16 bg-cabinet-surface px-3 py-3 text-left text-xs font-semibold leading-5 text-cabinet-text hover:bg-cabinet-elevated"
                  key={template.id}
                  onClick={() => onIdeaChange(template.prompt)}
                  type="button"
                >
                  {template.label}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="mt-7">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cabinet-muted">
              입력 예시
            </p>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {GAME_IDEA_EXAMPLES.map((example) => (
                <li key={example}>
                  <button
                    className="min-h-11 w-full border-l-2 border-cabinet-brass/60 bg-cabinet-background/45 px-3 py-2 text-left text-xs leading-5 text-cabinet-muted hover:bg-cabinet-elevated hover:text-cabinet-text"
                    onClick={() => onIdeaChange(example)}
                    type="button"
                  >
                    {example}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-8 flex justify-center">
            <button
              className="min-h-12 w-full rounded-cabinet-sm border border-cabinet-brass bg-cabinet-accent px-6 text-sm font-bold text-cabinet-text hover:bg-cabinet-accent/80 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              disabled={idea.trim().length === 0 || isStarting}
              type="submit"
            >
              {isStarting ? 'Mock AI가 첫 질문을 준비하는 중…' : '기획 대화 시작'}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
