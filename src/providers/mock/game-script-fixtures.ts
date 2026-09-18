import type { ScriptFileId } from '../../domain/game-project-workspace';

export interface GameScriptGuide {
  fileId: ScriptFileId;
  name: string;
  language: 'C#';
  content: string;
  purpose: string;
  safeValues: readonly string[];
  riskyParts: readonly string[];
  connectedObjects: readonly string[];
  commonErrors: readonly string[];
}

const PLAYER_MOVEMENT = `using UnityEngine;

[RequireComponent(typeof(Rigidbody2D))]
public class PlayerMovement : MonoBehaviour
{
    [SerializeField] private float moveSpeed = 5f;

    private Rigidbody2D body;

    private void Awake()
    {
        body = GetComponent<Rigidbody2D>();
    }

    private void FixedUpdate()
    {
        Vector2 input = new Vector2(
            Input.GetAxisRaw("Horizontal"),
            Input.GetAxisRaw("Vertical")
        ).normalized;

        body.linearVelocity = input * moveSpeed;
    }
}
`;

const GAME_MANAGER = `using UnityEngine;

public class GameManager : MonoBehaviour
{
    [SerializeField] private int requiredItems = 6;
    private int collectedItems = 0;

    public void RegisterCollectible()
    {
        collectedItems += 1;
        Debug.Log($"Collected: {collectedItems} / {requiredItems}");

        if (collectedItems >= requiredItems)
        {
            Debug.Log("Prototype complete");
        }
    }
}
`;

const COLLECTIBLE = `using UnityEngine;

public class Collectible : MonoBehaviour
{
    [SerializeField] private GameManager gameManager;

    private void OnTriggerEnter2D(Collider2D other)
    {
        if (!other.CompareTag("Player"))
        {
            return;
        }

        gameManager.RegisterCollectible();
        gameObject.SetActive(false);
    }
}
`;

export const GAME_SCRIPT_GUIDES: readonly GameScriptGuide[] = Object.freeze([
  {
    fileId: 'Assets/Scripts/PlayerMovement.cs',
    name: 'PlayerMovement.cs',
    language: 'C#',
    content: PLAYER_MOVEMENT,
    purpose: '키보드 입력을 읽어 플레이어의 2D 물리 이동 속도를 정합니다.',
    safeValues: ['moveSpeed: 캐릭터 이동 속도. 3~8 사이에서 먼저 시험하세요.'],
    riskyParts: [
      'FixedUpdate(물리 계산 주기마다 호출되는 함수)와 linearVelocity(현재 이동 속도 값)의 연결을 지우면 물리 이동이 멈출 수 있습니다.',
    ],
    connectedObjects: ['플레이어 객체', 'Rigidbody2D(2D 물리 이동을 처리하는 Unity 구성 요소)'],
    commonErrors: [
      '플레이어에 Rigidbody2D가 없으면 실행 시 오류가 납니다.',
      '구형 Unity에서는 linearVelocity(현재 이동 속도 값) 대신 velocity(이전 버전의 이동 속도 값)가 필요할 수 있습니다.',
    ],
  },
  {
    fileId: 'Assets/Scripts/GameManager.cs',
    name: 'GameManager.cs',
    language: 'C#',
    content: GAME_MANAGER,
    purpose: '수집한 아이템 수를 세고 목표 개수에 도달했는지 확인합니다.',
    safeValues: ['requiredItems: 완료에 필요한 아이템 수. Scene(게임 한 화면)에 놓인 개수와 맞추세요.'],
    riskyParts: ['RegisterCollectible의 증가 로직을 중복 호출하면 점수가 두 번 오를 수 있습니다.'],
    connectedObjects: ['GameManager라는 빈 객체', '각 Collectible의 gameManager 입력 칸'],
    commonErrors: [
      'Scene의 아이템 수보다 requiredItems가 크면 완료할 수 없습니다.',
      'Collectible에 GameManager가 연결되지 않으면 수집 시 오류가 납니다.',
    ],
  },
  {
    fileId: 'Assets/Scripts/Collectible.cs',
    name: 'Collectible.cs',
    language: 'C#',
    content: COLLECTIBLE,
    purpose: '플레이어가 아이템의 감지 영역에 닿으면 점수를 알리고 아이템을 숨깁니다.',
    safeValues: ['직접 바꿀 숫자는 없습니다. Player 태그 이름만 프로젝트 설정과 맞추세요.'],
    riskyParts: [
      'CompareTag(객체 종류 표식을 비교하는 함수) 검사나 중복 방지 코드를 지우면 다른 객체가 점수를 올릴 수 있습니다.',
    ],
    connectedObjects: [
      '각 아이템 객체',
      'Collider2D(2D 충돌·겹침을 감지하는 영역), Is Trigger(밀어내지 않고 닿음만 감지하는 옵션) 체크',
      'GameManager 객체',
    ],
    commonErrors: [
      '플레이어의 Tag(객체 종류 표식)가 Player가 아니면 충돌해도 수집되지 않습니다.',
      'Collider2D의 Is Trigger가 꺼져 있으면 OnTriggerEnter2D(2D 감지 영역에 들어올 때 호출되는 함수)가 실행되지 않을 수 있습니다.',
    ],
  },
]);

export function getGameScriptGuide(fileId: ScriptFileId): GameScriptGuide {
  const guide = GAME_SCRIPT_GUIDES.find((candidate) => candidate.fileId === fileId);
  if (!guide) {
    throw new Error(`Unknown example script: ${fileId}`);
  }
  return guide;
}
