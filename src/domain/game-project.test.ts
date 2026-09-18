import { describe, expect, it } from 'vitest';
import {
  appendGameIdeationAnswer,
  createGameIdeationSession,
  type GameIdeationSession,
} from './game-ideation';
import {
  GameProjectValidationError,
  createRuleBasedGameProject,
  validateGameProject,
} from './game-project';
import { MIDNIGHT_ARCHIVE_PROJECT } from '../providers/mock/game-project-fixtures';

function createCompletedSession(
  idea = '고양이가 책을 모으는 플랫폼 게임',
): GameIdeationSession {
  const responses = [
    '서가 사이를 뛰어다니며 흩어진 책을 모은다.',
    '잃어버린 책 다섯 권을 모두 서가에 돌려놓으면 끝난다.',
    '세 번 장애물에 부딪히면 실패한다.',
    '따뜻하지만 조금 쓸쓸한 밤의 서재 분위기',
    '12분 정도',
  ];
  return responses.reduce(
    (session, response) => appendGameIdeationAnswer(session, response),
    createGameIdeationSession(idea),
  );
}

describe('game project domain', () => {
  it('creates a deterministic rule-based design from all five answers', () => {
    const project = createRuleBasedGameProject(createCompletedSession(), {
      id: 'game-fixed-1',
      now: '2026-07-30T08:30:00.000Z',
    });

    expect(project.id).toBe('game-fixed-1');
    expect(project.source).toBe('mock');
    expect(project.overview).toMatchObject({
      title: 'The Book Collector',
      genre: '2D 플랫폼',
      coreAction: '서가 사이를 뛰어다니며 흩어진 책을 모은다.',
      winCondition: '잃어버린 책 다섯 권을 모두 서가에 돌려놓으면 끝난다.',
      failureCondition: '세 번 장애물에 부딪히면 실패한다.',
      estimatedPlayTimeMinutes: 12,
      completionStatus: 'design-draft',
    });
    expect(project.design.coreRules).toContain(
      '실패 기준: 세 번 장애물에 부딪히면 실패한다.',
    );
    expect(project.design.controls).toEqual([
      '방향키 또는 A/D로 이동',
      'Space로 점프',
    ]);
    expect(project.createdAt).toBe('2026-07-30T08:30:00.000Z');
    expect(project.updatedAt).toBe(project.createdAt);
  });

  it('does not create a project before the conversation is complete', () => {
    const incomplete = appendGameIdeationAnswer(
      createGameIdeationSession('우주선 게임'),
      '운석을 피한다.',
    );

    expect(() =>
      createRuleBasedGameProject(incomplete, {
        id: 'game-incomplete',
        now: '2026-07-30T08:30:00.000Z',
      }),
    ).toThrow(/All five/);
  });

  it('keeps derived fields valid at the maximum answer length', () => {
    const responses = [
      'A'.repeat(2_000),
      '정해진 목표를 달성하면 끝난다.',
      '제한 시간이 끝나면 실패한다.',
      'B'.repeat(2_000),
      '10분',
    ];
    const session = responses.reduce(
      (current, response) => appendGameIdeationAnswer(current, response),
      createGameIdeationSession('C'.repeat(2_000)),
    );

    const project = createRuleBasedGameProject(session, {
      id: 'game-boundary',
      now: '2026-07-30T08:30:00.000Z',
    });

    expect(project.overview.title.length).toBeLessThanOrEqual(80);
    expect(project.overview.oneLineDescription.length).toBeLessThan(4_000);
    expect(validateGameProject(project)).toEqual(project);
  });

  it('provides a complete and valid Midnight Archive starter project', () => {
    const project = validateGameProject(MIDNIGHT_ARCHIVE_PROJECT);

    expect(project.overview.title).toBe('Midnight Archive');
    expect(project.overview.genre).toBe('탑다운 퍼즐 어드벤처');
    expect(project.design.minimumViableFeatures).toHaveLength(5);
    expect(project.design.futureFeatures.length).toBeGreaterThan(0);
    expect(project.source).toBe('mock');
  });

  it('strictly validates fields and returns defensive copies', () => {
    const validated = validateGameProject(MIDNIGHT_ARCHIVE_PROJECT);

    expect(validated).not.toBe(MIDNIGHT_ARCHIVE_PROJECT);
    expect(validated.overview).not.toBe(MIDNIGHT_ARCHIVE_PROJECT.overview);
    expect(validated.design.gameplayLoop).not.toBe(
      MIDNIGHT_ARCHIVE_PROJECT.design.gameplayLoop,
    );

    expect(() =>
      validateGameProject({ ...MIDNIGHT_ARCHIVE_PROJECT, unexpected: true }),
    ).toThrow(GameProjectValidationError);

    expect(() =>
      validateGameProject({
        ...MIDNIGHT_ARCHIVE_PROJECT,
        design: {
          ...MIDNIGHT_ARCHIVE_PROJECT.design,
          controls: ['Space로 조사', 'Space로 조사'],
        },
      }),
    ).toThrow(/duplicate/);

    expect(() =>
      validateGameProject({
        ...MIDNIGHT_ARCHIVE_PROJECT,
        updatedAt: '2026-07-29T23:59:59.000Z',
      }),
    ).toThrow(/earlier/);
  });
});
