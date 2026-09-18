import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { useGameAtelier } from '../../hooks/use-game-atelier';
import { GameAtelierStart } from './components/GameAtelierStart';
import { GameIdeationChat } from './components/GameIdeationChat';
import { GameProjectShelf } from './components/GameProjectShelf';
import { GameProjectWorkbench } from './components/GameProjectWorkbench';

function AtelierLoadingState({ label }: { label: string }): React.JSX.Element {
  return (
    <section className="border-y border-cabinet-border bg-cabinet-surface/45 px-4 py-10 sm:px-7">
      <LoadingSkeleton label={label} lines={6} />
    </section>
  );
}

export function GameAtelier(): React.JSX.Element {
  const atelier = useGameAtelier();

  if (atelier.loadStatus === 'loading') {
    return (
      <section className="mx-auto w-full max-w-[1500px] px-3 py-7 sm:px-6 sm:py-9 lg:px-8">
        <AtelierLoadingState label="저장된 Game Atelier 프로젝트 불러오는 중" />
      </section>
    );
  }

  if (atelier.loadStatus === 'error') {
    return (
      <section className="mx-auto w-full max-w-[1500px] px-3 py-7 sm:px-6 sm:py-9 lg:px-8">
        <ErrorMessage
          message={atelier.loadError ?? '저장된 게임 프로젝트를 불러오지 못했습니다.'}
          onRetry={atelier.retryLoad}
          retryLabel="프로젝트 다시 불러오기"
          title="Game Atelier를 열 수 없습니다"
        />
      </section>
    );
  }

  const renderWorkspace = (): React.JSX.Element => {
    if (atelier.screen === 'start') {
      return (
        <>
          {atelier.operationError ? (
            <div className="mb-5">
              <ErrorMessage
                message={atelier.operationError}
                onRetry={atelier.clearOperationError}
                retryLabel="아이디어 다시 확인"
                title="Mock AI 대화를 시작하지 못했습니다"
              />
            </div>
          ) : null}
          <GameAtelierStart
            idea={atelier.idea}
            isStarting={atelier.operation === 'starting'}
            onIdeaChange={atelier.setIdea}
            onStart={atelier.startConversation}
          />
        </>
      );
    }

    if (atelier.screen === 'conversation' && atelier.turn) {
      if (atelier.turn.isComplete && atelier.operation === 'creating') {
        return <AtelierLoadingState label="Mock AI가 Game Project를 생성하는 중" />;
      }

      return (
        <>
          {atelier.operationError ? (
            <div className="mb-5">
              <ErrorMessage
                message={atelier.operationError}
                onRetry={
                  atelier.turn.isComplete
                    ? atelier.retryCreateProject
                    : atelier.clearOperationError
                }
                retryLabel={atelier.turn.isComplete ? '프로젝트 생성 다시 시도' : '답변 다시 확인'}
                title={
                  atelier.turn.isComplete
                    ? 'Mock AI 프로젝트를 만들지 못했습니다'
                    : 'Mock AI가 답변을 처리하지 못했습니다'
                }
              />
            </div>
          ) : null}
          <GameIdeationChat
            answer={atelier.answer}
            isWorking={atelier.operation !== 'idle'}
            onAnswerChange={atelier.setAnswer}
            onCancel={atelier.cancelConversation}
            onSubmitAnswer={atelier.submitAnswer}
            turn={atelier.turn}
          />
        </>
      );
    }

    if (atelier.screen === 'project' && atelier.activeProject) {
      return (
        <GameProjectWorkbench
          isBuiltIn={atelier.activeProject.id === 'midnight-archive'}
          key={atelier.activeProject.id}
          onRetrySave={atelier.retrySave}
          project={atelier.activeProject}
          saveError={atelier.saveError}
          saveState={atelier.saveState}
        />
      );
    }

    return (
      <EmptyState
        action={{ label: '새 게임 기획하기', onClick: atelier.startNewProject }}
        description="시작할 프로젝트를 찾지 못했습니다. 새 아이디어를 입력해 첫 프로젝트를 만들어보세요."
        eyebrow="Game Atelier · Mock AI"
        title="프로젝트가 비어 있습니다"
      />
    );
  };

  return (
    <section className="mx-auto w-full max-w-[1500px] px-3 py-7 sm:px-6 sm:py-9 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-cabinet-border pb-5">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.25em] text-cabinet-brass">
            Game Atelier · Mock AI
          </p>
          <h1 className="mt-2 font-serif text-3xl text-cabinet-text sm:text-4xl">
            Shape an idea before building it.
          </h1>
        </div>
        <p className="max-w-md text-xs leading-5 text-cabinet-muted sm:text-right">
          모든 질문과 프로젝트 초안은 외부 LLM 없이 로컬 규칙 기반 Mock AI로 생성됩니다.
        </p>
      </header>

      <div className="grid min-w-0 gap-6 lg:grid-cols-[272px_minmax(0,1fr)]">
        <section
          aria-label="Game Atelier 작업 영역"
          className="min-w-0 lg:col-start-2 lg:row-start-1"
        >
          {renderWorkspace()}
        </section>
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <GameProjectShelf
            activeProjectId={atelier.activeProject?.id ?? null}
            onCreateNew={atelier.startNewProject}
            onSelectProject={atelier.selectProject}
            projects={atelier.projects}
          />
        </div>
      </div>

      <footer className="mt-8 border-y border-cabinet-border bg-cabinet-surface/35 px-4 py-4 text-center text-xs leading-6 text-cabinet-muted">
        현재 Game Atelier의 AI 질문과 기획 결과는 모두 예시용 Mock AI가 생성합니다.
      </footer>
    </section>
  );
}
