import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EmptyState } from './EmptyState';
import { ErrorMessage } from './ErrorMessage';
import { LoadingSkeleton } from './LoadingSkeleton';

describe('shared state components', () => {
  it('announces loading without exposing decorative skeleton lines', () => {
    const markup = renderToStaticMarkup(
      createElement(LoadingSkeleton, { label: 'Loading saved items', lines: 2 }),
    );

    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('Loading saved items');
  });

  it('renders errors as alerts', () => {
    const markup = renderToStaticMarkup(
      createElement(ErrorMessage, { message: 'The mock provider did not respond.' }),
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain('The mock provider did not respond.');
  });

  it('renders an editorial empty state without an alert role', () => {
    const markup = renderToStaticMarkup(
      createElement(EmptyState, {
        title: 'Nothing saved yet',
        description: 'Saved material will appear here.',
      }),
    );

    expect(markup).toContain('Nothing saved yet');
    expect(markup).not.toContain('role="alert"');
  });
});
