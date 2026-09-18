import type { ScriptFileId } from '../../../domain/game-project-workspace';
import { SCRIPT_FILE_IDS } from '../../../domain/game-project-workspace';

interface GameAssetTreeProps {
  onSelectScript?: (fileId: ScriptFileId) => void;
  selectedScriptId?: ScriptFileId | null;
}

function shortName(fileId: ScriptFileId): string {
  return fileId.split('/').at(-1) ?? fileId;
}

export function GameAssetTree({
  onSelectScript,
  selectedScriptId = null,
}: GameAssetTreeProps): React.JSX.Element {
  return (
    <nav aria-label="가상 Unity Assets 파일 트리" className="font-mono text-xs text-cabinet-muted">
      <ul className="space-y-2">
        <li>
          <span className="font-bold text-cabinet-text">Assets/</span>
          <ul className="ml-4 mt-2 space-y-2 border-l border-cabinet-border pl-3">
            <li>
              <span className="text-cabinet-brass">Scenes/</span>
              <ul className="ml-4 mt-2 border-l border-cabinet-border pl-3">
                <li>MainScene.unity</li>
              </ul>
            </li>
            <li>
              <span className="text-cabinet-brass">Scripts/</span>
              <ul className="ml-4 mt-2 space-y-1 border-l border-cabinet-border pl-2">
                {SCRIPT_FILE_IDS.map((fileId) => (
                  <li key={fileId}>
                    {onSelectScript ? (
                      <button
                        aria-current={selectedScriptId === fileId ? 'true' : undefined}
                        className={`min-h-9 w-full px-2 text-left hover:bg-cabinet-elevated hover:text-cabinet-text ${
                          selectedScriptId === fileId
                            ? 'border-l-2 border-cabinet-brass bg-cabinet-elevated text-cabinet-text'
                            : 'border-l-2 border-transparent'
                        }`}
                        onClick={() => onSelectScript(fileId)}
                        type="button"
                      >
                        {shortName(fileId)}
                      </button>
                    ) : (
                      shortName(fileId)
                    )}
                  </li>
                ))}
              </ul>
            </li>
            <li>
              <span className="text-cabinet-brass">Prefabs/</span>
              <ul className="ml-4 mt-2 border-l border-cabinet-border pl-3">
                <li className="italic text-cabinet-muted">비어 있음</li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
    </nav>
  );
}
