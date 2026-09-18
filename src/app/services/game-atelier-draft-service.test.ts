import { describe, expect, it } from 'vitest';
import { createGameIdeationSession, createGameIdeationTurn } from '../../domain/game-ideation';
import { GameAtelierDraftService } from './game-atelier-draft-service';

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => values.delete(key),
    setItem: (key: string, value: string) => values.set(key, value),
    values,
  };
}

describe('GameAtelierDraftService', () => {
  it('restores an unfinished Mock AI question and answer input', () => {
    const storage = createStorage();
    const service = new GameAtelierDraftService(storage);
    const turn = createGameIdeationTurn(createGameIdeationSession('비 오는 도시 게임'));
    service.save({
      screen: 'conversation',
      idea: '비 오는 도시 게임',
      answer: '우산을 들고 단서를 찾습니다.',
      turn,
    });

    expect(service.load()).toMatchObject({
      screen: 'conversation',
      idea: '비 오는 도시 게임',
      answer: '우산을 들고 단서를 찾습니다.',
      turn: { question: { id: 'player-action' } },
    });
  });

  it('removes an empty start draft', () => {
    const storage = createStorage();
    const service = new GameAtelierDraftService(storage);
    service.save({ screen: 'start', idea: 'draft', answer: '', turn: null });
    service.save({ screen: 'start', idea: '', answer: '', turn: null });
    expect(service.load()).toBeNull();
  });

  it('rejects corrupted local data without exposing it to the UI', () => {
    const storage = createStorage();
    storage.setItem('the-cabinet:game-atelier-draft:v1', '{"dataVersion":99}');
    const service = new GameAtelierDraftService(storage);
    expect(service.load()).toBeNull();
    expect(storage.values.size).toBe(0);
  });
});
