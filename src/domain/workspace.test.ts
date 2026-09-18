import { describe, expect, it } from 'vitest';
import { getRoomDefinition, ROOM_DEFINITIONS } from './workspace';

describe('workspace room definitions', () => {
  it('contains exactly the two stage-one workspace rooms', () => {
    expect(ROOM_DEFINITIONS.map((room) => room.id)).toEqual(['market-room', 'game-atelier']);
  });

  it('uses unique room identifiers', () => {
    const identifiers = ROOM_DEFINITIONS.map((room) => room.id);
    expect(new Set(identifiers).size).toBe(identifiers.length);
  });

  it('resolves a room definition by identifier', () => {
    expect(getRoomDefinition('game-atelier').navigationLabel).toBe('Game Atelier');
  });
});
