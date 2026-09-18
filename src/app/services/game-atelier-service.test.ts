import { describe, expect, it } from 'vitest';
import { MockLLMProvider } from '../../providers/mock/mock-llm-provider';
import { GameAtelierService } from './game-atelier-service';

describe('GameAtelierService', () => {
  it('keeps the UI-facing service dependent on the LLMProvider interface', async () => {
    const service = new GameAtelierService(new MockLLMProvider({ latencyMs: 0 }));
    const turn = await service.startGameIdeation('비 오는 서울을 걷는 짧은 감성 게임');

    expect(turn.question?.prompt).toBe('플레이어가 무엇을 하나요?');
    const nextTurn = await service.answerQuestion(turn.session, '골목을 걷고 기억을 모은다.');
    expect(nextTurn.question?.prompt).toBe('게임은 언제 끝나나요?');
  });

  it('returns a fresh validated copy of the built-in project', () => {
    const service = new GameAtelierService(new MockLLMProvider({ latencyMs: 0 }));
    const first = service.getBuiltInProjects()[0];
    const second = service.getBuiltInProjects()[0];

    expect(first.overview.title).toBe('Midnight Archive');
    expect(first).not.toBe(second);
    expect(first.design.coreRules).not.toBe(second.design.coreRules);
  });
});
