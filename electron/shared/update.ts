export const UPDATE_STATUSES = [
  'idle',
  'checking',
  'available',
  'downloading',
  'downloaded',
  'up-to-date',
  'error',
] as const;

export type UpdateStatus = (typeof UPDATE_STATUSES)[number];

export type UpdateCheckTrigger = 'automatic' | 'manual';

/**
 * Main Process가 소유하고 Renderer에는 읽기 전용 스냅샷으로 전달하는 업데이트 상태다.
 * null 필드를 명시해 IPC 직렬화 뒤에도 상태의 형태가 바뀌지 않도록 한다.
 */
export interface UpdateState {
  status: UpdateStatus;
  currentVersion: string;
  availableVersion: string | null;
  progressPercent: number | null;
  errorMessage: string | null;
  requestId: number | null;
  checkTrigger: UpdateCheckTrigger | null;
}

export type UpdateInstallResult =
  | { status: 'installing' }
  | { status: 'cancelled' }
  | { status: 'blocked'; message: string };
