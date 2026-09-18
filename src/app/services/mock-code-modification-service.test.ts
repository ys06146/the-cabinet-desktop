import { describe, expect, it } from 'vitest';
import { getGameScriptGuide } from '../../providers/mock/game-script-fixtures';
import { applyMockCodeInstruction } from './mock-code-modification-service';

describe('Mock code modification service', () => {
  it('raises the editable movement speed for a speed keyword', () => {
    const result = applyMockCodeInstruction('캐릭터를 빠르게 해줘');
    expect(result.fileId).toBe('Assets/Scripts/PlayerMovement.cs');
    expect(result.content).toContain('moveSpeed = 8f');
    expect(result.changed).toBe(true);
  });

  it('adds a jump draft once without losing an earlier speed edit', () => {
    const speed = applyMockCodeInstruction('캐릭터를 빠르게 해줘');
    const jump = applyMockCodeInstruction('점프 기능을 넣어줘', {
      [speed.fileId]: speed.content,
    });
    const repeated = applyMockCodeInstruction('점프 기능을 넣어줘', {
      [jump.fileId]: jump.content,
    });

    expect(jump.content).toContain('jumpForce = 7f');
    expect(jump.content).toContain('moveSpeed = 8f');
    expect(jump.content).toContain('input.x * moveSpeed');
    expect(jump.content).toContain('body.linearVelocity.y');
    expect(jump.content).not.toContain('body.linearVelocity = input * moveSpeed');
    expect(repeated.changed).toBe(false);
  });

  it('changes the completion target to ten items', () => {
    const result = applyMockCodeInstruction('아이템 10개를 모으면 끝내줘');
    expect(result.fileId).toBe('Assets/Scripts/GameManager.cs');
    expect(result.content).toContain('requiredItems = 10');
  });

  it('limits a mixed multi-file request to the completion target without a false player summary', () => {
    const result = applyMockCodeInstruction(
      '캐릭터를 빠르게 하고 아이템 10개를 모으면 끝내줘',
    );
    expect(result.fileId).toBe('Assets/Scripts/GameManager.cs');
    expect(result.content).toContain('requiredItems = 10');
    expect(result.summaries).toEqual([
      'GameManager의 완료 목표를 아이템 10개로 바꿨습니다.',
    ]);
  });

  it('returns supported examples without changing code for an unknown request', () => {
    const result = applyMockCodeInstruction('배경을 영화처럼 바꿔줘');
    expect(result.changed).toBe(false);
    expect(result.supportedExamples).toHaveLength(3);
    expect(result.content).toBe(
      getGameScriptGuide('Assets/Scripts/PlayerMovement.cs').content,
    );
  });
});
