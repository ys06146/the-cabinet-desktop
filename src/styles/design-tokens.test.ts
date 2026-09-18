/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const stylesheet = readFileSync(new URL('./index.css', import.meta.url), 'utf8');

const requiredTokens = [
  'background',
  'surface',
  'surface-elevated',
  'text',
  'text-muted',
  'border',
  'accent',
  'positive',
  'negative',
  'warning',
] as const;

describe('design tokens', () => {
  it.each(requiredTokens)('declares the %s color token', (token) => {
    expect(stylesheet).toContain(`--color-${token}:`);
  });

  it('keeps the Renderer unconstrained by a fixed minimum width', () => {
    expect(stylesheet).not.toContain('min-width: 1100px');
    expect(stylesheet).not.toContain('min-width: 320px');
    expect(stylesheet).toContain('min-width: 0');
  });

  it('defines a reduced-motion fallback', () => {
    expect(stylesheet).toContain('@media (prefers-reduced-motion: reduce)');
  });
});