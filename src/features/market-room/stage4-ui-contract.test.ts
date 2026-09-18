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
  it('exposes every news filter and the complete detail brief', () => {
    for (const label of ['전체', '국내', '미국', '기업', '산업', '경제', '정책']) {
      expect(newsSource).toContain(`'${label}'`);
    }

    for (const section of ['요약', '직접 영향', '간접 영향', '반대 관점', '확인되지 않은 부분']) {
      expect(newsSource).toContain(`title="${section}"`);
    }

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
