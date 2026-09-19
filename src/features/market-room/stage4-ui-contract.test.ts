/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const newsSource = readFileSync(new URL('./components/NewsDesk.tsx', import.meta.url), 'utf8');
const themeSource = readFileSync(new URL('./components/ThemeExplorer.tsx', import.meta.url), 'utf8');
const memoSource = readFileSync(
  new URL('./components/InvestmentMemoEditor.tsx', import.meta.url),
  'utf8',
);

describe('Stage 4 Market Room UI contracts', () => {
  it('exposes every news filter, article provenance and safe original links without invented analysis', () => {
    for (const label of ['전체', '국내', '미국', '기업', '산업', '경제', '정책']) {
      expect(newsSource).toContain(`'${label}'`);
    }

    for (const field of ['news.outlet', 'news.publishedAt', 'news.fetchedAt', 'news.articleUrl']) {
      expect(newsSource).toContain(field);
    }
    expect(newsSource).toContain('window.theCabinet.openNewsArticle(news.id)');
    for (const field of ['directImpact', 'indirectImpact', 'counterPerspective', 'SENTIMENT_PRESENTATION']) {
      expect(newsSource).not.toContain(field);
    }
    expect(newsSource).toContain('마지막으로 받은 뉴스를 표시합니다.');

    expect(newsSource).toContain('dialog.showModal()');
    expect(newsSource).toContain('triggerRef.current?.focus()');
    expect(newsSource).toContain('onToggleSaved(item.id)');
  });

  it('limits the theme relationship map to the requested three levels', () => {
    expect(themeSource).toContain("core: '핵심 기업'");
    expect(themeSource).toContain("'supply-chain': '공급망 기업'");
    expect(themeSource).toContain("'indirect-beneficiary': '간접 수혜 기업'");
    expect(themeSource).toContain('theme.domesticStocks');
    expect(themeSource).toContain('theme.usStocks');
  });

  it('gives the invalidation condition first-class prominence and keeps file access behind callbacks', () => {
    const invalidationPosition = memoSource.indexOf('생각이 틀렸다고 판단할 조건');
    const interestReasonPosition = memoSource.indexOf('관심 이유');

    expect(invalidationPosition).toBeGreaterThan(-1);
    expect(invalidationPosition).toBeLessThan(interestReasonPosition);
    expect(memoSource).toContain('border-2 border-cabinet-negative');
    expect(memoSource).toContain('JSON 내보내기');
    expect(memoSource).toContain('JSON 가져오기');
    expect(memoSource).toContain('onImportJson');
    expect(memoSource).not.toContain('type="file"');
  });
});
