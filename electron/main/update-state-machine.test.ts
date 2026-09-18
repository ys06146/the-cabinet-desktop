import { describe, expect, it } from 'vitest';
import {
  createInitialUpdateState,
  reduceUpdateState,
  toUserFriendlyUpdateError,
} from './update-state-machine';

function beginCheck(requestId = 1) {
  return reduceUpdateState(createInitialUpdateState('0.1.0'), {
    type: 'CHECK_REQUESTED',
    requestId,
    trigger: 'manual',
  });
}

describe('update state machine', () => {
  it('starts idle with a stable renderer-facing shape', () => {
    expect(createInitialUpdateState(' 0.1.0 ')).toEqual({
      status: 'idle',
      currentVersion: '0.1.0',
      availableVersion: null,
      progressPercent: null,
      errorMessage: null,
      requestId: null,
      checkTrigger: null,
    });
  });

  it('moves through checking, available, downloading, and downloaded', () => {
    const checking = beginCheck();
    const available = reduceUpdateState(checking, {
      type: 'UPDATE_AVAILABLE',
      requestId: 1,
      version: '0.2.0',
    });
    const downloading = reduceUpdateState(available, {
      type: 'DOWNLOAD_STARTED',
      requestId: 1,
    });
    const progressed = reduceUpdateState(downloading, {
      type: 'DOWNLOAD_PROGRESS',
      requestId: 1,
      percent: 36.25,
    });
    const downloaded = reduceUpdateState(progressed, {
      type: 'UPDATE_DOWNLOADED',
      requestId: 1,
      version: '0.2.0',
    });

    expect(checking.status).toBe('checking');
    expect(available).toMatchObject({
      status: 'available',
      availableVersion: '0.2.0',
    });
    expect(downloading.progressPercent).toBe(0);
    expect(progressed.progressPercent).toBe(36.25);
    expect(downloaded).toMatchObject({
      status: 'downloaded',
      availableVersion: '0.2.0',
      progressPercent: 100,
    });
  });

  it('reports that the current version is up to date', () => {
    const state = reduceUpdateState(beginCheck(), {
      type: 'UPDATE_NOT_AVAILABLE',
      requestId: 1,
    });

    expect(state).toMatchObject({
      status: 'up-to-date',
      currentVersion: '0.1.0',
      availableVersion: null,
    });
  });

  it('clamps progress and refuses delayed progress that moves backwards', () => {
    const available = reduceUpdateState(beginCheck(), {
      type: 'UPDATE_AVAILABLE',
      requestId: 1,
      version: '0.2.0',
    });
    const downloading = reduceUpdateState(available, {
      type: 'DOWNLOAD_STARTED',
      requestId: 1,
    });
    const atMaximum = reduceUpdateState(downloading, {
      type: 'DOWNLOAD_PROGRESS',
      requestId: 1,
      percent: 105,
    });
    const delayed = reduceUpdateState(atMaximum, {
      type: 'DOWNLOAD_PROGRESS',
      requestId: 1,
      percent: 80,
    });

    expect(atMaximum.progressPercent).toBe(100);
    expect(delayed).toBe(atMaximum);
  });

  it('ignores updater events from an older request', () => {
    const firstResult = reduceUpdateState(beginCheck(1), {
      type: 'UPDATE_NOT_AVAILABLE',
      requestId: 1,
    });
    const secondCheck = reduceUpdateState(firstResult, {
      type: 'CHECK_REQUESTED',
      requestId: 2,
      trigger: 'automatic',
    });
    const delayedAvailable = reduceUpdateState(secondCheck, {
      type: 'UPDATE_AVAILABLE',
      requestId: 1,
      version: '9.9.9',
    });

    expect(delayedAvailable).toBe(secondCheck);
    expect(delayedAvailable).toMatchObject({
      status: 'checking',
      requestId: 2,
      checkTrigger: 'automatic',
    });
  });

  it('ignores events that arrive in an invalid order', () => {
    const checking = beginCheck();
    const earlyProgress = reduceUpdateState(checking, {
      type: 'DOWNLOAD_PROGRESS',
      requestId: 1,
      percent: 50,
    });
    const earlyDownloaded = reduceUpdateState(checking, {
      type: 'UPDATE_DOWNLOADED',
      requestId: 1,
      version: '0.2.0',
    });

    expect(earlyProgress).toBe(checking);
    expect(earlyDownloaded).toBe(checking);
  });

  it('does not let late progress or errors replace a completed download', () => {
    const available = reduceUpdateState(beginCheck(), {
      type: 'UPDATE_AVAILABLE',
      requestId: 1,
      version: '0.2.0',
    });
    const downloading = reduceUpdateState(available, {
      type: 'DOWNLOAD_STARTED',
      requestId: 1,
    });
    const downloaded = reduceUpdateState(downloading, {
      type: 'UPDATE_DOWNLOADED',
      requestId: 1,
      version: '0.2.0',
    });

    expect(
      reduceUpdateState(downloaded, {
        type: 'DOWNLOAD_PROGRESS',
        requestId: 1,
        percent: 90,
      }),
    ).toBe(downloaded);
    expect(
      reduceUpdateState(downloaded, {
        type: 'FAILED',
        requestId: 1,
        message: 'late error',
      }),
    ).toBe(downloaded);
  });

  it('requires monotonically increasing positive request IDs', () => {
    const checked = reduceUpdateState(beginCheck(4), {
      type: 'UPDATE_NOT_AVAILABLE',
      requestId: 4,
    });

    expect(
      reduceUpdateState(checked, {
        type: 'CHECK_REQUESTED',
        requestId: 4,
        trigger: 'manual',
      }),
    ).toBe(checked);
    expect(
      reduceUpdateState(checked, {
        type: 'CHECK_REQUESTED',
        requestId: -1,
        trigger: 'manual',
      }),
    ).toBe(checked);
  });

  it('keeps the last request ID across reset to reject old events safely', () => {
    const checked = reduceUpdateState(beginCheck(7), {
      type: 'UPDATE_NOT_AVAILABLE',
      requestId: 7,
    });
    const reset = reduceUpdateState(checked, { type: 'RESET' });

    expect(reset).toMatchObject({ status: 'idle', requestId: 7 });
    expect(
      reduceUpdateState(reset, {
        type: 'CHECK_REQUESTED',
        requestId: 6,
        trigger: 'manual',
      }),
    ).toBe(reset);
  });

  it('records a friendly failure and permits a newer retry', () => {
    const failed = reduceUpdateState(beginCheck(), {
      type: 'FAILED',
      requestId: 1,
      message: '인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
    });
    const retry = reduceUpdateState(failed, {
      type: 'CHECK_REQUESTED',
      requestId: 2,
      trigger: 'manual',
    });

    expect(failed).toMatchObject({
      status: 'error',
      errorMessage: '인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
    });
    expect(retry).toMatchObject({
      status: 'checking',
      errorMessage: null,
      requestId: 2,
    });
  });

  it('refuses a downloaded event whose version does not match the offer', () => {
    const available = reduceUpdateState(beginCheck(), {
      type: 'UPDATE_AVAILABLE',
      requestId: 1,
      version: '0.2.0',
    });
    const downloading = reduceUpdateState(available, {
      type: 'DOWNLOAD_STARTED',
      requestId: 1,
    });
    const mismatched = reduceUpdateState(downloading, {
      type: 'UPDATE_DOWNLOADED',
      requestId: 1,
      version: '0.3.0',
    });

    expect(mismatched).toBe(downloading);
  });
});

describe('toUserFriendlyUpdateError', () => {
  it.each([
    ['getaddrinfo ENOTFOUND github.com', '인터넷 연결'],
    ['404: latest.yml was not found', '업데이트 정보'],
    ['EACCES: permission denied', '저장할 수 없습니다'],
    ['sha512 checksum mismatch', '안전하게 확인하지 못해'],
    ['unexpected failure', '문제가 발생했습니다'],
  ])('turns %s into an understandable message', (rawMessage, expectedText) => {
    expect(toUserFriendlyUpdateError(new Error(rawMessage))).toContain(expectedText);
  });
});
