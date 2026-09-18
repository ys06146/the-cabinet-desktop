import { useId } from 'react';
import {
  MARKET_RESEARCH_LIMITS,
  type InvestmentMemo,
} from '../../../domain/market-research-data';

export type MemoSaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';

export interface InvestmentMemoEditorProps {
  companyName: string;
  dataVersion: number;
  hasUnsavedDrafts?: boolean;
  isExporting?: boolean;
  isImporting?: boolean;
  lastSavedAt?: string | null;
  memo: InvestmentMemo;
  onChange: (memo: InvestmentMemo) => void;
  onExportJson: () => void;
  onImportJson: () => void;
  onSave: () => void;
  saveState: MemoSaveState;
  statusMessage?: string | null;
  statusMessageTone?: 'info' | 'warning' | 'error';
  symbol: string;
}

const SAVE_STATE_PRESENTATION: Record<MemoSaveState, { label: string; className: string }> = {
  idle: { label: '불러옴', className: 'text-cabinet-muted' },
  dirty: { label: '저장되지 않은 변경', className: 'text-cabinet-warning' },
  saving: { label: '저장 중…', className: 'text-cabinet-brass' },
  saved: { label: '저장됨', className: 'text-cabinet-positive' },
  error: { label: '저장 실패', className: 'text-cabinet-negative' },
};

type TextMemoField = Exclude<keyof InvestmentMemo, 'nextReviewDate'>;

function formatLastSavedAt(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function MemoTextArea({
  description,
  field,
  id,
  label,
  memo,
  onChange,
  rows = 4,
  tone = 'default',
}: {
  description?: string;
  field: TextMemoField;
  id: string;
  label: string;
  memo: InvestmentMemo;
  onChange: (memo: InvestmentMemo) => void;
  rows?: number;
  tone?: 'default' | 'positive' | 'negative';
}): React.JSX.Element {
  const descriptionId = description ? `${id}-description` : undefined;
  const toneClasses = {
    default: 'border-cabinet-border focus:border-cabinet-brass',
    positive: 'border-cabinet-positive/60 focus:border-cabinet-positive',
    negative: 'border-cabinet-negative/60 focus:border-cabinet-negative',
  }[tone];

  return (
    <div>
      <label className="text-xs font-bold text-cabinet-text" htmlFor={id}>
        {label}
      </label>
      {description ? (
        <p className="mt-1 text-[0.68rem] leading-5 text-cabinet-muted" id={descriptionId}>
          {description}
        </p>
      ) : null}
      <textarea
        aria-describedby={descriptionId}
        className={`mt-2 w-full resize-y rounded-cabinet-sm border bg-cabinet-background/55 px-3 py-3 font-sans text-sm leading-6 text-cabinet-text placeholder:text-cabinet-muted/60 ${toneClasses}`}
        id={id}
        maxLength={MARKET_RESEARCH_LIMITS.maxMemoFieldCharacters}
        onChange={(event) => onChange({ ...memo, [field]: event.target.value })}
        rows={rows}
        value={memo[field]}
      />
    </div>
  );
}

export function InvestmentMemoEditor({
  companyName,
  dataVersion,
  hasUnsavedDrafts = false,
  isExporting = false,
  isImporting = false,
  lastSavedAt = null,
  memo,
  onChange,
  onExportJson,
  onImportJson,
  onSave,
  saveState,
  statusMessage = null,
  statusMessageTone = 'info',
  symbol,
}: InvestmentMemoEditorProps): React.JSX.Element {
  const idPrefix = useId();
  const savePresentation = SAVE_STATE_PRESENTATION[saveState];
  const formattedLastSavedAt = formatLastSavedAt(lastSavedAt);

  const updateText = (field: TextMemoField, value: string): void => {
    onChange({ ...memo, [field]: value });
  };

  return (
    <section aria-labelledby={`${idPrefix}-title`} className="border border-cabinet-border bg-cabinet-surface/45">
      <header className="border-b border-cabinet-border px-4 py-5 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[0.62rem] font-bold uppercase tracking-[0.22em] text-cabinet-brass">
              Private Research Ledger
            </p>
            <h2 className="mt-1 font-serif text-2xl text-cabinet-text" id={`${idPrefix}-title`}>
              투자 메모
            </h2>
            <p className="mt-2 min-w-0 truncate text-xs text-cabinet-muted">
              <span className="font-semibold text-cabinet-text">{companyName}</span>
              <span aria-hidden="true"> · </span>
              <span className="font-mono">{symbol}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p aria-live="polite" className={`text-xs font-semibold ${savePresentation.className}`} role="status">
              {savePresentation.label}
            </p>
            {formattedLastSavedAt ? (
              <p className="mt-1 font-mono text-[0.6rem] text-cabinet-muted">최근 저장 {formattedLastSavedAt}</p>
            ) : null}
            <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-wider text-cabinet-muted">
              Data v{dataVersion}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-cabinet-border pt-4">
          <button
            className="min-h-11 border border-cabinet-border px-3 text-xs font-semibold text-cabinet-muted hover:border-cabinet-brass hover:text-cabinet-text disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isExporting || isImporting || hasUnsavedDrafts}
            onClick={onExportJson}
            title={hasUnsavedDrafts ? '저장하지 않은 메모를 먼저 저장해 주세요.' : undefined}
            type="button"
          >
            {isExporting ? '내보내는 중…' : 'JSON 내보내기'}
          </button>
          <button
            className="min-h-11 border border-cabinet-border px-3 text-xs font-semibold text-cabinet-muted hover:border-cabinet-brass hover:text-cabinet-text disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isImporting || isExporting || hasUnsavedDrafts}
            onClick={onImportJson}
            title={hasUnsavedDrafts ? '저장하지 않은 메모를 먼저 저장해 주세요.' : undefined}
            type="button"
          >
            {isImporting ? '가져오는 중…' : 'JSON 가져오기'}
          </button>
        </div>
        {hasUnsavedDrafts ? (
          <p className="mt-3 text-xs leading-5 text-cabinet-warning">
            JSON 가져오기·내보내기 전에 모든 메모 변경을 저장해 주세요.
          </p>
        ) : null}
        {statusMessage ? (
          <p
            className={`mt-3 border-l-2 px-3 py-2 text-xs leading-5 ${
              statusMessageTone === 'error'
                ? 'border-cabinet-negative bg-cabinet-negative/5 text-cabinet-negative'
                : statusMessageTone === 'warning'
                  ? 'border-cabinet-warning bg-cabinet-warning/5 text-cabinet-warning'
                  : 'border-cabinet-brass bg-cabinet-background/35 text-cabinet-muted'
            }`}
            role={statusMessageTone === 'error' ? 'alert' : 'status'}
          >
            {statusMessage}
          </p>
        ) : null}
      </header>

      <form
        className="space-y-6 px-4 py-5 sm:px-5"
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <section
          aria-labelledby={`${idPrefix}-invalidation-heading`}
          className="rounded-cabinet-md border-2 border-cabinet-negative bg-cabinet-negative/5 p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-serif text-xl text-cabinet-negative" id={`${idPrefix}-invalidation-heading`}>
              생각이 틀렸다고 판단할 조건
            </h3>
            <span className="border border-cabinet-negative/70 px-2 py-1 text-[0.58rem] font-bold uppercase tracking-[0.18em] text-cabinet-negative">
              Most Important
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-cabinet-muted" id={`${idPrefix}-invalidation-description`}>
            확신을 강화하는 근거보다 먼저 확인합니다. 관찰 가능한 사실과 수치로 적어 두세요.
          </p>
          <label className="sr-only" htmlFor={`${idPrefix}-invalidation`}>
            생각이 틀렸다고 판단할 조건
          </label>
          <textarea
            aria-describedby={`${idPrefix}-invalidation-description`}
            className="mt-3 w-full resize-y rounded-cabinet-sm border border-cabinet-negative/70 bg-cabinet-background/70 px-3 py-3 font-sans text-sm leading-6 text-cabinet-text placeholder:text-cabinet-muted/60 focus:border-cabinet-negative"
            id={`${idPrefix}-invalidation`}
            maxLength={MARKET_RESEARCH_LIMITS.maxMemoFieldCharacters}
            onChange={(event) => updateText('invalidationCondition', event.target.value)}
            rows={6}
            value={memo.invalidationCondition}
          />
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <MemoTextArea
            description="왜 이 종목을 계속 관찰하는지 간결하게 기록합니다."
            field="interestReason"
            id={`${idPrefix}-interest-reason`}
            label="관심 이유"
            memo={memo}
            onChange={onChange}
          />
          <MemoTextArea
            description="긍정적 가정을 지지하는 확인 가능한 근거를 기록합니다."
            field="positiveThesis"
            id={`${idPrefix}-positive-thesis`}
            label="긍정적 근거"
            memo={memo}
            onChange={onChange}
            tone="positive"
          />
          <MemoTextArea
            description="반대 증거와 불편한 가정을 함께 남깁니다."
            field="negativeThesis"
            id={`${idPrefix}-negative-thesis`}
            label="부정적 근거"
            memo={memo}
            onChange={onChange}
            tone="negative"
          />
          <MemoTextArea
            description="실적, 밸류에이션, 수주, 점유율 등 다음 판단에 필요한 수치를 적습니다."
            field="numbersToVerify"
            id={`${idPrefix}-numbers-to-verify`}
            label="확인해야 할 숫자"
            memo={memo}
            onChange={onChange}
          />
        </div>

        <MemoTextArea
          description="어떤 변화가 생기면 메모를 다시 검토할지 조건을 정합니다."
          field="reviewCondition"
          id={`${idPrefix}-review-condition`}
          label="검토 조건"
          memo={memo}
          onChange={onChange}
        />

        <div className="border-t border-cabinet-border pt-5">
          <label className="text-xs font-bold text-cabinet-text" htmlFor={`${idPrefix}-next-review-date`}>
            다음 확인 날짜
          </label>
          <p className="mt-1 text-[0.68rem] leading-5 text-cabinet-muted" id={`${idPrefix}-next-review-date-description`}>
            이 날짜는 일정 알림이 아니라 메모를 다시 열어볼 기준입니다.
          </p>
          <input
            aria-describedby={`${idPrefix}-next-review-date-description`}
            className="mt-2 min-h-11 w-full rounded-cabinet-sm border border-cabinet-border bg-cabinet-background/55 px-3 font-mono text-sm text-cabinet-text focus:border-cabinet-brass sm:w-auto"
            id={`${idPrefix}-next-review-date`}
            onChange={(event) => onChange({ ...memo, nextReviewDate: event.target.value || null })}
            type="date"
            value={memo.nextReviewDate ?? ''}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-cabinet-border pt-5">
          <p className="max-w-xl text-[0.68rem] leading-5 text-cabinet-muted">
            메모는 사용자 데이터 위치에 저장되어 앱 업데이트 후에도 유지됩니다.
          </p>
          <button
            className="min-h-11 min-w-28 rounded-cabinet-sm border border-cabinet-brass bg-cabinet-accent px-5 text-sm font-bold text-cabinet-text hover:bg-cabinet-accent/80 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saveState === 'saving'}
            type="submit"
          >
            {saveState === 'saving' ? '저장 중…' : '메모 저장'}
          </button>
        </div>
      </form>
    </section>
  );
}
