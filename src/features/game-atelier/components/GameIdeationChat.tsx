import { GAME_IDEATION_LIMITS, type GameIdeationTurn } from '../../../domain/game-ideation';

interface GameIdeationChatProps {
  answer: string;
  isWorking: boolean;
  onAnswerChange: (answer: string) => void;
  onCancel: () => void;
  onSubmitAnswer: () => void;
  turn: GameIdeationTurn;
}

export function GameIdeationChat({
  answer,
  isWorking,
  onAnswerChange,
  onCancel,
  onSubmitAnswer,
  turn,
}: GameIdeationChatProps): React.JSX.Element {
  const visibleQuestionNumber = Math.min(turn.progress.answered + 1, turn.progress.total);

  return (
    <section aria-labelledby="ideation-chat-title" className="mx-auto max-w-4xl">
      <header className="border-y border-cabinet-border bg-cabinet-surface/45 px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-cabinet-brass">
              Mock AI · Rules-based conversation
            </p>
            <h2 className="mt-2 font-serif text-2xl text-cabinet-text sm:text-3xl" id="ideation-chat-title">
              아이디어를 플레이 가능한 범위로 좁히기
            </h2>
          </div>
          <p className="font-mono text-xs tabular-nums text-cabinet-muted" role="status">
            질문 {visibleQuestionNumber} / {turn.progress.total}
          </p>
        </div>
        <div
          aria-label={`${turn.progress.answered} of ${turn.progress.total} questions answered`}
          aria-valuemax={turn.progress.total}
          aria-valuemin={0}
          aria-valuenow={turn.progress.answered}
          className="mt-5 h-1 overflow-hidden bg-cabinet-border"
          role="progressbar"
        >
          <span
            className="block h-full bg-cabinet-brass transition-[width] duration-150"
            style={{ width: `${(turn.progress.answered / turn.progress.total) * 100}%` }}
          />
        </div>
      </header>

      <div aria-live="polite" className="space-y-5 px-1 py-6 sm:px-5">
        <article className="mr-auto max-w-[92%] border-l-2 border-cabinet-brass bg-cabinet-surface px-4 py-3 sm:max-w-[80%]">
          <p className="text-[0.58rem] font-bold uppercase tracking-[0.18em] text-cabinet-brass">
            Your idea
          </p>
          <p className="mt-2 break-words whitespace-pre-wrap text-sm leading-6 text-cabinet-text">
            {turn.session.initialIdea}
          </p>
        </article>

        {turn.session.answers.map((item) => (
          <div className="space-y-3" key={item.questionId}>
            <article className="mr-auto max-w-[92%] border border-cabinet-border bg-cabinet-surface/55 px-4 py-3 sm:max-w-[80%]">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.18em] text-cabinet-brass">
                Mock AI
              </p>
              <p className="mt-2 text-sm leading-6 text-cabinet-text">{item.question}</p>
            </article>
            <article className="ml-auto max-w-[92%] border-r-2 border-cabinet-accent bg-cabinet-elevated px-4 py-3 sm:max-w-[80%]">
              <p className="text-[0.58rem] font-bold uppercase tracking-[0.18em] text-cabinet-muted">
                You
              </p>
              <p className="mt-2 break-words whitespace-pre-wrap text-sm leading-6 text-cabinet-text">
                {item.response}
              </p>
            </article>
          </div>
        ))}

        {turn.question ? (
          <article className="mr-auto max-w-[92%] border border-cabinet-brass/70 bg-cabinet-surface px-4 py-4 shadow-cabinet-overlay sm:max-w-[80%]">
            <p className="text-[0.58rem] font-bold uppercase tracking-[0.18em] text-cabinet-brass">
              Mock AI · Current question
            </p>
            <p
              className="mt-2 font-serif text-xl leading-7 text-cabinet-text"
              id="game-ideation-current-question"
            >
              {turn.question.prompt}
            </p>
          </article>
        ) : null}
      </div>

      {turn.question ? (
        <form
          className="border-y border-cabinet-border bg-cabinet-surface/40 px-3 py-5 sm:px-6"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitAnswer();
          }}
        >
          <label
            className="text-xs font-bold text-cabinet-muted"
            htmlFor="game-ideation-answer"
            id="game-ideation-answer-label"
          >
            답변
          </label>
          <textarea
            aria-labelledby="game-ideation-answer-label game-ideation-current-question"
            autoFocus
            className="mt-2 min-h-28 w-full resize-y rounded-cabinet-sm border border-cabinet-border bg-cabinet-background/75 px-4 py-3 text-sm leading-6 text-cabinet-text placeholder:text-cabinet-muted/70"
            id="game-ideation-answer"
            key={turn.question.id}
            maxLength={GAME_IDEATION_LIMITS.maxAnswerCharacters}
            onChange={(event) => onAnswerChange(event.target.value)}
            placeholder="짧게 답해도 좋습니다. 다음 질문은 이 답변을 기록한 뒤에 나타납니다."
            value={answer}
          />
          <div className="mt-3 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              className="min-h-11 rounded-cabinet-sm border border-cabinet-border px-4 text-sm font-semibold text-cabinet-muted hover:border-cabinet-brass hover:text-cabinet-text"
              disabled={isWorking}
              onClick={onCancel}
              type="button"
            >
              대화 나가기
            </button>
            <button
              className="min-h-11 rounded-cabinet-sm border border-cabinet-brass bg-cabinet-accent px-5 text-sm font-bold text-cabinet-text hover:bg-cabinet-accent/80 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={answer.trim().length === 0 || isWorking}
              type="submit"
            >
              {isWorking ? 'Mock AI가 답변을 정리하는 중…' : '답변 보내기'}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
