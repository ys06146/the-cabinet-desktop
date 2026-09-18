import type { ScriptFileId } from '../../domain/game-project-workspace';
import { getGameScriptGuide } from '../../providers/mock/game-script-fixtures';

export interface MockCodeModificationResult {
  changed: boolean;
  content: string;
  fileId: ScriptFileId;
  summaries: readonly string[];
  supportedExamples: readonly string[];
}

export const MOCK_CODE_INSTRUCTION_EXAMPLES = Object.freeze([
  '캐릭터를 빠르게 해줘',
  '점프 기능을 넣어줘',
  '아이템 10개를 모으면 끝내줘',
]);

function addJumpDraft(content: string): string {
  if (content.includes('jumpForce')) {
    return content;
  }

  const withSetting = content.replace(
    /([ ]{4}\[SerializeField\] private float moveSpeed = [0-9]+(?:\.[0-9]+)?f;)/u,
    '$1\n    [SerializeField] private float jumpForce = 7f;',
  );
  if (withSetting === content) {
    return content;
  }
  const withJumpCompatibleMovement = withSetting.replace(
    '        body.linearVelocity = input * moveSpeed;',
    `        body.linearVelocity = new Vector2(
            input.x * moveSpeed,
            body.linearVelocity.y
        );`,
  );
  if (withJumpCompatibleMovement === withSetting) {
    return content;
  }
  const classEnd = withJumpCompatibleMovement.lastIndexOf('\n}');
  if (classEnd < 0) {
    return content;
  }

  const jumpMethod = `

    private void Update()
    {
        if (Input.GetButtonDown("Jump"))
        {
            body.AddForce(Vector2.up * jumpForce, ForceMode2D.Impulse);
        }
    }`;
  return `${withJumpCompatibleMovement.slice(0, classEnd)}${jumpMethod}${withJumpCompatibleMovement.slice(classEnd)}`;
}

export function applyMockCodeInstruction(
  instruction: string,
  currentContents: Readonly<Partial<Record<ScriptFileId, string>>> = {},
): MockCodeModificationResult {
  const normalized = instruction.trim().toLocaleLowerCase('ko-KR');
  let fileId: ScriptFileId = 'Assets/Scripts/PlayerMovement.cs';
  let content = currentContents[fileId] ?? getGameScriptGuide(fileId).content;
  const summaries: string[] = [];

  if (/(아이템|수집|collect).*(10|열)|10\s*개/u.test(normalized)) {
    fileId = 'Assets/Scripts/GameManager.cs';
    content = currentContents[fileId] ?? getGameScriptGuide(fileId).content;
    const next = content.replace(
      /private int requiredItems = [0-9]+;/u,
      'private int requiredItems = 10;',
    );
    if (next !== content) {
      content = next;
      summaries.push('GameManager의 완료 목표를 아이템 10개로 바꿨습니다.');
    }
    return {
      changed: summaries.length > 0,
      content,
      fileId,
      summaries,
      supportedExamples: MOCK_CODE_INSTRUCTION_EXAMPLES,
    };
  }

  if (/(빠르게|속도.*(높|올)|fast)/u.test(normalized)) {
    const next = content.replace(
      /private float moveSpeed = [0-9]+(?:\.[0-9]+)?f;/u,
      'private float moveSpeed = 8f;',
    );
    if (next !== content) {
      content = next;
      summaries.push('PlayerMovement의 moveSpeed 예시 값을 8로 높였습니다.');
    }
  }

  if (/(점프|뛰기|jump)/u.test(normalized)) {
    const next = addJumpDraft(content);
    if (next !== content) {
      content = next;
      summaries.push('PlayerMovement에 jumpForce와 Space 입력 점프 초안을 추가했습니다.');
    }
  }

  return {
    changed: summaries.length > 0,
    content,
    fileId,
    summaries,
    supportedExamples: MOCK_CODE_INSTRUCTION_EXAMPLES,
  };
}
