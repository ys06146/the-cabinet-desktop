import { useState } from 'react';
import { ErrorMessage } from '../../components/ui/ErrorMessage';
import { LoadingSkeleton } from '../../components/ui/LoadingSkeleton';
import { useUpdateManager } from '../../hooks/use-update-manager';
import {
  getUpdatePresentation,
  type UpdateStatusTone,
} from './update-presentation';

const toneClasses: Record<UpdateStatusTone, string> = {
  neutral: 'border-l-cabinet-brass',
  positive: 'border-l-cabinet-positive',
  warning: 'border-l-cabinet-warning',
  negative: 'border-l-cabinet-negative',
};

const primaryButtonClass =
  'min-h-11 rounded-cabinet-sm border border-cabinet-brass bg-cabinet-accent px-4 text-sm font-bold text-cabinet-text hover:bg-cabinet-accent/80 disabled:cursor-not-allowed disabled:opacity-50';
const secondaryButtonClass =
  'min-h-11 rounded-cabinet-sm border border-cabinet-border bg-cabinet-elevated px-4 text-sm font-semibold text-cabinet-text hover:border-cabinet-brass disabled:cursor-not-allowed disabled:opacity-50';

export function UpdateSettings(): React.JSX.Element {
  const {
    actionError,
    checkForUpdates,
    downloadUpdate,
    installOutcome,
    installUpdate,
    loading,
    pendingAction,
    state,
  } = useUpdateManager();
  const [deferredInstallVersion, setDeferredInstallVersion] = useState<string | null>(null);

  if (loading && !state) {
    return (
      <section className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-8 lg:px-12">
        <LoadingSkeleton label="업데이트 설정 불러오는 중" lines={6} />
      </section>
    );
  }

  const presentation = state ? getUpdatePresentation(state) : null;
  const actionPending = pendingAction !== null;
  const downloadedVersionKey =
    state?.status === 'downloaded'
      ? `${state.currentVersion}:${state.availableVersion ?? 'unknown'}`
      : null;
  const installDeferred =
    downloadedVersionKey !== null && deferredInstallVersion === downloadedVersionKey;

  return (
    <article className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-10 lg:px-12">
      <header className="border-b border-cabinet-border pb-6">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.24em] text-cabinet-brass">
          Cabinet preferences
        </p>
        <h1 className="mt-2 font-serif text-3xl text-cabinet-text sm:text-4xl">설정</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-cabinet-muted">
          설치된 앱의 버전을 확인하고, 업데이트 다운로드와 설치 시점을 직접 선택합니다.
        </p>
      </header>

      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <section
          aria-labelledby="update-settings-title"
          className="border border-cabinet-border bg-cabinet-surface"
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-cabinet-border px-5 py-5 sm:px-6">
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em] text-cabinet-muted">
                Application update
              </p>
              <h2
                className="mt-2 font-serif text-2xl text-cabinet-text"
                id="update-settings-title"
              >
                자동 업데이트
              </h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-cabinet-muted">현재 버전</p>
              <p className="mt-1 font-mono text-sm text-cabinet-text">
                {state ? `v${state.currentVersion}` : '확인할 수 없음'}
              </p>
            </div>
          </div>

          <div className="space-y-5 p-5 sm:p-6">
            {actionError ? (
              <ErrorMessage
                message={actionError}
                title="업데이트 작업을 계속할 수 없습니다"
              />
            ) : null}

            {presentation ? (
              <div
                aria-atomic="true"
                aria-live={presentation.tone === 'negative' ? 'assertive' : 'polite'}
                className={`border-y border-r border-cabinet-border border-l-2 bg-cabinet-background/45 px-4 py-4 ${toneClasses[presentation.tone]}`}
                role={presentation.tone === 'negative' ? 'alert' : 'status'}
              >
                <p className="font-semibold text-cabinet-text">{presentation.title}</p>
                <p className="mt-2 text-sm leading-6 text-cabinet-muted">
                  {presentation.message}
                </p>
              </div>
            ) : (
              <ErrorMessage
                message="업데이트 상태를 불러오지 못했습니다. 설정 화면을 다시 열어 주세요."
                title="업데이트 상태를 확인할 수 없습니다"
              />
            )}

            {presentation?.progressPercent !== null &&
            presentation?.progressPercent !== undefined ? (
              <div aria-label="업데이트 다운로드 진행률">
                <div className="mb-2 flex items-center justify-between gap-4 text-xs text-cabinet-muted">
                  <span>다운로드 진행률</span>
                  <span className="font-mono text-cabinet-text">
                    {Math.round(presentation.progressPercent)}%
                  </span>
                </div>
                <progress
                  aria-label={`업데이트 ${Math.round(presentation.progressPercent)}% 다운로드됨`}
                  className="h-2 w-full accent-cabinet-brass"
                  max={100}
                  value={presentation.progressPercent}
                />
              </div>
            ) : null}

            {presentation?.canInstall ? (
              installDeferred ? (
                <div className="border-t border-cabinet-border pt-5">
                  <p className="text-sm leading-6 text-cabinet-muted">
                    설치를 보류했습니다. 현재 작업을 계속할 수 있으며 앱은 갑자기 종료되지 않습니다.
                  </p>
                  <button
                    className={`${secondaryButtonClass} mt-4`}
                    onClick={() => setDeferredInstallVersion(null)}
                    type="button"
                  >
                    재시작 여부 다시 선택
                  </button>
                </div>
              ) : (
                <fieldset className="border-t border-cabinet-border pt-5">
                  <legend className="font-serif text-xl text-cabinet-text">
                    지금 재시작하여 업데이트를 설치할까요?
                  </legend>
                  <p className="mt-2 text-sm leading-6 text-cabinet-muted">
                    설치 전에 메모, 게임 프로젝트와 작성 중인 입력의 저장을 확인합니다. 저장에
                    실패하면 설치를 중단하고 앱을 계속 실행합니다.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      className={primaryButtonClass}
                      disabled={actionPending}
                      onClick={() => {
                        setDeferredInstallVersion(null);
                        void installUpdate();
                      }}
                      type="button"
                    >
                      {pendingAction === 'install'
                        ? '저장 상태 확인 중…'
                        : '재시작하고 업데이트 설치'}
                    </button>
                    <button
                      className={secondaryButtonClass}
                      disabled={actionPending}
                      onClick={() => setDeferredInstallVersion(downloadedVersionKey)}
                      type="button"
                    >
                      나중에
                    </button>
                  </div>
                </fieldset>
              )
            ) : null}

            {installOutcome === 'installing' ? (
              <p
                className="border-l-2 border-cabinet-positive bg-cabinet-positive/5 px-4 py-3 text-sm text-cabinet-text"
                role="status"
              >
                저장을 마쳤습니다. 업데이트 설치를 위해 앱을 안전하게 재시작하는 중입니다.
              </p>
            ) : null}

            {installOutcome === 'cancelled' ? (
              <p
                className="border-l-2 border-cabinet-warning bg-cabinet-warning/5 px-4 py-3 text-sm text-cabinet-text"
                role="status"
              >
                업데이트 설치를 취소했습니다. 앱은 계속 실행되며 준비가 되면 다시 선택할 수
                있습니다.
              </p>
            ) : null}

            <div className="flex flex-wrap gap-3 border-t border-cabinet-border pt-5">
              {presentation?.canCheck ? (
                <button
                  className={secondaryButtonClass}
                  disabled={actionPending}
                  onClick={() => void checkForUpdates()}
                  type="button"
                >
                  {pendingAction === 'check' ? '업데이트 확인 중…' : '업데이트 확인'}
                </button>
              ) : null}
              {presentation?.canDownload ? (
                <button
                  className={primaryButtonClass}
                  disabled={actionPending}
                  onClick={() => void downloadUpdate()}
                  type="button"
                >
                  {pendingAction === 'download' ? '다운로드 요청 중…' : '새 버전 다운로드'}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <aside
          aria-labelledby="update-safety-title"
          className="h-fit border-y border-cabinet-border bg-cabinet-surface/55 px-5 py-5"
        >
          <h2 className="font-serif text-xl text-cabinet-text" id="update-safety-title">
            업데이트 원칙
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-cabinet-muted">
            <li>다운로드와 재시작은 사용자가 직접 선택합니다.</li>
            <li>설치 전 사용자 작업의 저장 여부를 먼저 확인합니다.</li>
            <li>저장 실패 시 업데이트를 중단하고 앱을 종료하지 않습니다.</li>
            <li>사용자 데이터는 앱 코드와 분리된 위치에 보존됩니다.</li>
          </ul>
        </aside>
      </div>
    </article>
  );
}
