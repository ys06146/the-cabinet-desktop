import {
  validateGameProject,
  type GameProject,
} from '../../domain/game-project';

export const MIDNIGHT_ARCHIVE_PROJECT: GameProject = validateGameProject({
  id: 'midnight-archive',
  initialIdea: '중세 서재에서 단서를 찾아 사라진 사서의 행방을 밝히는 짧은 추리 게임',
  overview: {
    title: 'Midnight Archive',
    oneLineDescription:
      '자정 전까지 봉인된 중세 서재를 조사해 사라진 사서의 마지막 기록을 복원하는 게임.',
    genre: '탑다운 퍼즐 어드벤처',
    coreAction: '서가를 탐색하고 기록 조각을 비교해 단서를 연결한다.',
    winCondition: '세 개의 핵심 단서를 올바른 순서로 연결해 비밀 서고를 연다.',
    failureCondition: '자정이 되기 전에 추리를 완성하지 못하거나 잘못된 기록을 세 번 확정한다.',
    estimatedPlayTimeMinutes: 15,
    completionStatus: 'design-draft',
    nextTask: '서가 조사, 단서 수집, 추리 보드 연결로 이어지는 한 개의 방을 검증한다.',
  },
  design: {
    objective: '사라진 사서의 기록을 복원하고 비밀 서고를 여는 것.',
    gameplayLoop: [
      '서재의 한 구역을 탐색한다.',
      '책과 사물을 조사해 기록 조각을 얻는다.',
      '추리 보드에서 관련 단서를 연결한다.',
      '연결 결과로 새 구역이나 마지막 결론을 연다.',
    ],
    coreRules: [
      '각 조사 대상은 하나의 단서 또는 분위기 정보를 제공한다.',
      '핵심 단서는 올바른 인과관계로 연결해야 확정된다.',
      '잘못된 연결을 세 번 확정하면 해당 시도가 종료된다.',
    ],
    controls: ['WASD 또는 방향키로 이동', 'E 또는 Space로 조사', '마우스로 단서를 선택하고 연결'],
    difficultyProgression:
      '초반에는 두 단서의 직접 관계를 보여주고, 후반에는 서로 모순되는 기록 사이에서 세 단서의 순서를 판단하게 한다.',
    scoringSystem: '점수 대신 발견한 단서 수, 잘못된 확정 횟수, 남은 시간을 결과 화면에 기록한다.',
    endConditions: [
      '성공: 세 개의 핵심 단서를 올바르게 연결해 비밀 서고를 연다.',
      '실패: 제한 시간이 끝나거나 잘못된 연결을 세 번 확정한다.',
    ],
    minimumViableFeatures: [
      '탐색 가능한 서재 한 개',
      '조사 대상 다섯 개',
      '핵심 단서 세 개',
      '단서 연결 보드',
      '성공 및 실패 결과 화면',
    ],
    futureFeatures: [
      '서재 구역 추가',
      '복수 결말',
      '단서 기록 보관함',
      '환경음과 시간대 변화',
    ],
  },
  source: 'mock',
  createdAt: '2026-07-30T00:00:00.000Z',
  updatedAt: '2026-07-30T00:00:00.000Z',
});
