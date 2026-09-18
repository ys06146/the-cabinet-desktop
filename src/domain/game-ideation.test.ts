import { describe, expect, it } from 'vitest';
import {
  GAME_IDEA_EXAMPLES,
  GAME_IDEA_TEMPLATES,
  GAME_IDEATION_QUESTIONS,
  GameIdeationValidationError,
  appendGameIdeationAnswer,
  createGameIdeationSession,
  createGameIdeationTurn,
  validateGameIdeationSession,
  type GameIdeationSession,
} from './game-ideation';

describe('game ideation domain', () => {
  it('publishes the requested templates, examples, and five questions in order', () => {
    expect(GAME_IDEA_TEMPLATES.map(({ label }) => label)).toEqual([
      '2D 플랫폼 게임',
      '탑다운 어드벤처',
      '퍼즐 게임',
      '비주얼 노벨',
      '간단한 슈팅 게임',
    ]);
    expect(GAME_IDEA_EXAMPLES).toEqual([
      '비 오는 서울을 걷는 짧은 감성 게임',
      '우주선으로 운석을 피하는 2D 게임',
      '중세 서재에서 단서를 찾는 추리 게임',
      '고양이가 책을 모으는 플랫폼 게임',
    ]);
    expect(GAME_IDEATION_QUESTIONS.map(({ prompt }) => prompt)).toEqual([
      '플레이어가 무엇을 하나요?',
      '게임은 언제 끝나나요?',
      '실패 조건은 무엇인가요?',
      '어떤 분위기를 원하나요?',
      '한 번 플레이하는 데 몇 분 정도 걸리나요?',
    ]);
  });

  it('exposes exactly one current question and advances only after each answer', () => {
    let session = createGameIdeationSession('  고양이가 책을 모으는 플랫폼 게임  ');

    for (const [index, expectedQuestion] of GAME_IDEATION_QUESTIONS.entries()) {
      const turn = createGameIdeationTurn(session);
      expect(turn.question).toEqual(expectedQuestion);
      expect(turn.isComplete).toBe(false);
      expect(turn.progress).toEqual({ answered: index, total: 5 });
      expect(turn.session.answers).toHaveLength(index);

      session = appendGameIdeationAnswer(session, `답변 ${index + 1}`);
    }

    const completed = createGameIdeationTurn(session);
    expect(completed.question).toBeNull();
    expect(completed.isComplete).toBe(true);
    expect(completed.progress).toEqual({ answered: 5, total: 5 });
    expect(completed.session.initialIdea).toBe('고양이가 책을 모으는 플랫폼 게임');
  });

  it('rejects empty answers, skipped questions, and answers after completion', () => {
    const initial = createGameIdeationSession('짧은 퍼즐 게임');
    expect(() => appendGameIdeationAnswer(initial, '   ')).toThrow(
      GameIdeationValidationError,
    );

    const outOfOrder: GameIdeationSession = {
      initialIdea: initial.initialIdea,
      answers: [
        {
          questionId: 'failure',
          question: '실패 조건은 무엇인가요?',
          response: '시간이 끝나면 실패한다.',
        },
      ],
    };
    expect(() => validateGameIdeationSession(outOfOrder)).toThrow(
      /required question order/,
    );

    let completed = initial;
    for (let index = 0; index < GAME_IDEATION_QUESTIONS.length; index += 1) {
      completed = appendGameIdeationAnswer(completed, `답변 ${index + 1}`);
    }
    expect(() => appendGameIdeationAnswer(completed, '여섯 번째 답변')).toThrow(
      /already complete/,
    );
  });
});
