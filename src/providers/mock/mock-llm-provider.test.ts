import { describe, expect, it } from 'vitest';
import { GAME_IDEATION_QUESTIONS } from '../../domain/game-ideation';
import { MockLLMProvider, MockLLMProviderError } from './mock-llm-provider';

const responses = [
  '운석 사이를 이동하며 구조 신호를 모은다.',
  '구조 신호를 다섯 개 모으면 끝난다.',
  '운석과 세 번 충돌하면 실패한다.',
  '고요하고 차가운 우주',
  '8분',
];

describe('MockLLMProvider', () => {
  it('returns one question at a time and creates a project only after all answers', async () => {
    const provider = new MockLLMProvider({
      latencyMs: 0,
      now: () => new Date('2026-07-30T09:00:00.000Z'),
      createId: (_now, sequence) => `game-test-${sequence}`,
    });

    let turn = await provider.startGameIdeation('우주선으로 운석을 피하는 2D 게임');
    expect(turn.question).toEqual(GAME_IDEATION_QUESTIONS[0]);

    for (const [index, response] of responses.entries()) {
      turn = await provider.answerQuestion(turn.session, response);
      expect(turn.progress.answered).toBe(index + 1);
      expect(turn.question).toEqual(GAME_IDEATION_QUESTIONS[index + 1] ?? null);
    }

    expect(turn.isComplete).toBe(true);
    const project = await provider.createGameProject(turn.session);
    expect(project.id).toBe('game-test-1');
    expect(project.overview.title).toBe('Meteor Passage');
    expect(project.overview.genre).toBe('2D 아케이드 슈팅');
    expect(project.overview.estimatedPlayTimeMinutes).toBe(8);
  });

  it('keeps simulated failures explicit and operation-specific', async () => {
    const provider = new MockLLMProvider({
      latencyMs: 0,
      failureRateByOperation: { answer: 1 },
    });
    const turn = await provider.startGameIdeation('짧은 퍼즐 게임');

    await expect(provider.answerQuestion(turn.session, '단서를 맞춘다.')).rejects.toBeInstanceOf(
      MockLLMProviderError,
    );
  });
});
