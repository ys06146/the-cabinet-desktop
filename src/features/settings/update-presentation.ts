import type { UpdateState } from '../../../electron/shared/update';

export type UpdateStatusTone = 'neutral' | 'positive' | 'warning' | 'negative';

export interface UpdatePresentation {
  canCheck: boolean;
  canDownload: boolean;
  canInstall: boolean;
  message: string;
  progressPercent: number | null;
  title: string;
  tone: UpdateStatusTone;
}

function availableVersionLabel(version: string | null): string {
  return version ? `v${version}` : '새 버전';
}

function normalizedProgress(progressPercent: number | null): number | null {
  if (progressPercent === null || !Number.isFinite(progressPercent)) {
    return null;
  }
  return Math.min(100, Math.max(0, progressPercent));
}

export function getUpdatePresentation(state: UpdateState): UpdatePresentation {
  switch (state.status) {
    case 'idle':
      return {
        title: '업데이트를 확인할 준비가 되었습니다',
        message: '업데이트 검사는 패키징된 설치형 앱에서만 실행됩니다.',
        tone: 'neutral',
        canCheck: true,
        canDownload: false,
        canInstall: false,
        progressPercent: null,
      };
    case 'checking':
      return {
        title: '업데이트 확인 중',
        message: '공개 릴리스에서 사용 가능한 새 버전을 확인하고 있습니다.',
        tone: 'neutral',
        canCheck: false,
        canDownload: false,
        canInstall: false,
        progressPercent: null,
      };
    case 'up-to-date':
      return {
        title: '최신 버전을 사용 중입니다',
        message: `현재 v${state.currentVersion}보다 새로운 공개 버전이 없습니다.`,
        tone: 'positive',
        canCheck: true,
        canDownload: false,
        canInstall: false,
        progressPercent: null,
      };
    case 'available':
      return {
        title: `${availableVersionLabel(state.availableVersion)} 업데이트 사용 가능`,
        message: '다운로드는 자동으로 시작되지 않습니다. 준비가 되면 직접 다운로드해 주세요.',
        tone: 'warning',
        canCheck: false,
        canDownload: true,
        canInstall: false,
        progressPercent: null,
      };
    case 'downloading': {
      const progressPercent = normalizedProgress(state.progressPercent);
      return {
        title: '업데이트 다운로드 중',
        message:
          progressPercent === null
            ? '다운로드 진행 정보를 기다리고 있습니다.'
            : `${Math.round(progressPercent)}% 다운로드했습니다.`,
        tone: 'neutral',
        canCheck: false,
        canDownload: false,
        canInstall: false,
        progressPercent,
      };
    }
    case 'downloaded':
      return {
        title: '업데이트 설치 준비 완료',
        message: `${availableVersionLabel(state.availableVersion)} 다운로드를 마쳤습니다. 설치 시점은 직접 선택할 수 있습니다.`,
        tone: 'positive',
        canCheck: false,
        canDownload: false,
        canInstall: true,
        progressPercent: 100,
      };
    case 'error':
      return {
        title: '업데이트 작업을 완료하지 못했습니다',
        message:
          state.errorMessage ??
          '인터넷 연결을 확인한 뒤 다시 시도해 주세요. 문제가 계속되면 다음 릴리스를 기다려 주세요.',
        tone: 'negative',
        canCheck: true,
        canDownload: false,
        canInstall: false,
        progressPercent: null,
      };
  }
}
