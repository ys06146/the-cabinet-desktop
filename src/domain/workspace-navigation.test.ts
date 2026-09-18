import { describe, expect, it } from 'vitest';
import { getWorkspaceNavigationItem, WORKSPACE_NAVIGATION_ITEMS } from './workspace';

describe('workspace navigation', () => {
  it('keeps the requested section order', () => {
    expect(WORKSPACE_NAVIGATION_ITEMS.map((item) => item.id)).toEqual([
      'market-room',
      'game-atelier',
      'saved-items',
      'notes',
      'settings',
    ]);
  });

  it('uses unique section identifiers', () => {
    const identifiers = WORKSPACE_NAVIGATION_ITEMS.map((item) => item.id);
    expect(new Set(identifiers).size).toBe(identifiers.length);
  });

  it('resolves the title used by the top bar', () => {
    expect(getWorkspaceNavigationItem('saved-items').label).toBe('Saved Items');
  });
});
