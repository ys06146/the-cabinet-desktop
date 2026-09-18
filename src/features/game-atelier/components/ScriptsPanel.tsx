import { useMemo, useState, type FormEvent } from 'react';
import type {
  ScriptFileId,
  ScriptOverrides,
} from '../../../domain/game-project-workspace';
import {
  applyMockCodeInstruction,
  MOCK_CODE_INSTRUCTION_EXAMPLES,
} from '../../../app/services/mock-code-modification-service';
import {
  GAME_SCRIPT_GUIDES,
  getGameScriptGuide,
} from '../../../providers/mock/game-script-fixtures';
import { GameAssetTree } from './GameAssetTree';

interface ScriptsPanelProps {
  onChange: (overrides: ScriptOverrides) => void;
  scriptOverrides: ScriptOverrides;
}

function GuideList({ items }: { items: readonly string[] }): React.JSX.Element {
  return (
    <ul className="mt-2 space-y-1.5 text-xs leading-5 text-cabinet-muted">
      {items.map((item) => (
        <li className="border-l border-cabinet-border pl-2" key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function ScriptsPanel({ onChange, scriptOverrides }: ScriptsPanelProps): React.JSX.Element {
  const [selectedFileId, setSelectedFileId] = useState<ScriptFileId>(GAME_SCRIPT_GUIDES[0].fileId);
  const [instruction, setInstruction] = useState('');
  const [resultMessage, setResultMessage] = useState('지원 예시를 선택하거나 자연어 요청을 입력하세요.');
  const guide = getGameScriptGuide(selectedFileId);
  const override = scriptOverrides[selectedFileId];
  const visibleContent = override?.content ?? guide.content;
  const currentContents = useMemo(
    () => Object.fromEntries(
      GAME_SCRIPT_GUIDES.map((candidate) => [
        candidate.fileId,
        scriptOverrides[candidate.fileId]?.content ?? candidate.content,
      ]),
    ) as Partial<Record<ScriptFileId, string>>,
    [scriptOverrides],
  );

  const submitInstruction = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmed = instruction.trim();
    if (!trimmed) {
      setResultMessage('수정 요청을 먼저 입력하세요.');
      return;
    }

    const result = applyMockCodeInstruction(trimmed, currentContents);
    if (!result.changed) {
      setResultMessage('적용할 새 변경을 찾지 못했습니다. 지원 예시를 확인하세요.');
      return;
    }

    const previous = scriptOverrides[result.fileId];
    onChange({
      ...scriptOverrides,
      [result.fileId]: {
        content: result.content,
        revision: (previous?.revision ?? 0) + 1,
        lastInstruction: trimmed,
        updatedAt: new Date().toISOString(),
      },
    });
    setSelectedFileId(result.fileId);
    setResultMessage(result.summaries.join(' '));
    setInstruction('');
  };

  return (
    <section aria-labelledby="scripts-panel-title" className="border border-cabinet-border bg-cabinet-surface/30">
      <header className="border-b border-cabinet-border bg-cabinet-elevated px-4 py-4 sm:px-5">
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.2em] text-cabinet-brass">
          Mock Code Workshop
        </p>
        <h3 className="mt-1 font-serif text-2xl text-cabinet-text" id="scripts-panel-title">Scripts</h3>
        <p className="mt-2 max-w-3xl text-xs leading-5 text-cabinet-muted">
          외부 LLM이나 Unity API를 호출하지 않는 키워드 기반 Mock 수정기입니다. 아래 내용은 실제 디스크 파일이 아닌 프로젝트 안의 C# 초안입니다.
        </p>
      </header>

      <form className="border-b border-cabinet-border bg-cabinet-background/40 p-4" onSubmit={submitInstruction}>
        <label className="text-xs font-bold text-cabinet-text" htmlFor="mock-code-instruction">
          Mock 코드 수정 요청
        </label>
        <div className="mt-2 flex min-w-0 flex-col gap-2 sm:flex-row">
          <input
            className="min-h-11 min-w-0 flex-1 border border-cabinet-border bg-cabinet-background px-3 text-sm text-cabinet-text placeholder:text-cabinet-muted"
            id="mock-code-instruction"
            maxLength={500}
            onChange={(event) => setInstruction(event.target.value)}
            placeholder="예: 캐릭터를 빠르게 해줘"
            value={instruction}
          />
          <button className="min-h-11 border border-cabinet-brass bg-cabinet-accent px-4 text-sm font-bold text-cabinet-text" type="submit">
            Mock 수정 적용
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2" aria-label="지원하는 Mock 수정 예시">
          {MOCK_CODE_INSTRUCTION_EXAMPLES.map((example) => (
            <button
              className="min-h-9 border border-cabinet-border px-2.5 text-left text-xs text-cabinet-muted hover:border-cabinet-brass hover:text-cabinet-text"
              key={example}
              onClick={() => setInstruction(example)}
              type="button"
            >
              {example}
            </button>
          ))}
        </div>
        <p className="mt-3 border-l-2 border-cabinet-brass px-3 text-xs leading-5 text-cabinet-muted" aria-live="polite">
          {resultMessage}
        </p>
      </form>

      <div className="grid min-w-0 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="border-b border-cabinet-border p-4 lg:border-b-0 lg:border-r">
          <GameAssetTree onSelectScript={setSelectedFileId} selectedScriptId={selectedFileId} />
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cabinet-border px-4 py-3">
            <div>
              <p className="break-all font-mono text-sm text-cabinet-text">{guide.fileId}</p>
              <p className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-cabinet-muted">{guide.language} example draft</p>
            </div>
            <span className="font-mono text-xs text-cabinet-brass">
              revision {override?.revision ?? 0}
            </span>
          </div>
          <pre className="max-h-[34rem] overflow-auto border-b border-cabinet-border bg-cabinet-background p-4 text-xs leading-5 text-cabinet-text" tabIndex={0}>
            <code>{visibleContent}</code>
          </pre>

          <dl className="grid min-w-0 md:grid-cols-2">
            <div className="border-b border-cabinet-border p-4 md:border-r">
              <dt className="text-xs font-bold text-cabinet-text">코드가 하는 일</dt>
              <dd className="mt-2 text-xs leading-5 text-cabinet-muted">{guide.purpose}</dd>
            </div>
            <div className="border-b border-cabinet-border p-4">
              <dt className="text-xs font-bold text-cabinet-text">사용자가 변경해도 되는 값</dt>
              <dd><GuideList items={guide.safeValues} /></dd>
            </div>
            <div className="border-b border-cabinet-border p-4 md:border-r">
              <dt className="text-xs font-bold text-cabinet-negative">변경 위험이 있는 부분</dt>
              <dd><GuideList items={guide.riskyParts} /></dd>
            </div>
            <div className="border-b border-cabinet-border p-4">
              <dt className="text-xs font-bold text-cabinet-text">Unity에서 연결할 객체</dt>
              <dd><GuideList items={guide.connectedObjects} /></dd>
            </div>
            <div className="p-4 md:col-span-2">
              <dt className="text-xs font-bold text-cabinet-warning">자주 발생하는 오류</dt>
              <dd><GuideList items={guide.commonErrors} /></dd>
            </div>
          </dl>
        </div>
      </div>
    </section>
  );
}
