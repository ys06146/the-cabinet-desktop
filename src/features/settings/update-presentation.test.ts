import { describe, expect, it } from 'vitest';
import type { UpdateState, UpdateStatus } from '../../../electron/shared/update';
import { getUpdatePresentation } from './update-presentation';

function createState(status: UpdateStatus, overrides: Partial<UpdateState> = {}): UpdateState {
  return {
    status,
    currentVersion: '0.1.0',
    availableVersion: null,
    progressPercent: null,
    errorMessage: null,
    requestId: null,
    checkTrigger: null,
    ...overrides,
  };
}

describe('update settings presentation', () => {
  it('offers only an explicit check while idle', () => {
    const presentation = getUpdatePresentation(createState('idle'));

    expect(presentation.canCheck).toBe(true);
    expect(presentation.canDownload).toBe(false);
    expect(presentation.canInstall).toBe(false);
  });

  it('offers an explicit download when a version is available', () => {
    const presentation = getUpdatePresentation(
      createState('available', { availableVersion: '0.2.0' }),
    );

    expect(presentation.title).toContain('v0.2.0');
    expect(presentation.message).toContain('자동으로 시작되지 않습니다');
    expect(presentation.canDownload).toBe(true);
  });

  it('clamps download progress for a valid progress element', () => {
    expect(
      getUpdatePresentation(createState('downloading', { progressPercent: 128 }))
        .progressPercent,
    ).toBe(100);
    expect(
      getUpdatePresentation(createState('downloading', { progressPercent: -4 }))
        .progressPercent,
    ).toBe(0);
  });

  it('requires an explicit install choice after download', () => {
    const presentation = getUpdatePresentation(
      createState('downloaded', { availableVersion: '0.2.0' }),
    );

    expect(presentation.canInstall).toBe(true);
    expect(presentation.message).toContain('직접 선택');
  });

  it('uses a clear fallback instead of exposing a technical error', () => {
    const presentation = getUpdatePresentation(createState('error'));

    expect(presentation.tone).toBe('negative');
    expect(presentation.message).toContain('인터넷 연결');
  });
});
