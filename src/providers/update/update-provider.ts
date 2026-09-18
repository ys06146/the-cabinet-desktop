import type {
  UpdateInstallResult,
  UpdateState,
} from '../../../electron/shared/update';

export type UpdateStateListener = (state: UpdateState) => void;

export interface UpdateProvider {
  getState: () => Promise<UpdateState>;
  checkForUpdates: () => Promise<UpdateState>;
  downloadUpdate: () => Promise<UpdateState>;
  installUpdate: () => Promise<UpdateInstallResult>;
  subscribe: (listener: UpdateStateListener) => () => void;
}
