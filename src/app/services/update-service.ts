import type {
  UpdateInstallResult,
  UpdateState,
} from '../../../electron/shared/update';
import { electronUpdateProvider } from '../../providers/update/electron-update-provider';
import type {
  UpdateProvider,
  UpdateStateListener,
} from '../../providers/update/update-provider';

export class UpdateService {
  constructor(private readonly provider: UpdateProvider) {}

  getState(): Promise<UpdateState> {
    return this.provider.getState();
  }

  checkForUpdates(): Promise<UpdateState> {
    return this.provider.checkForUpdates();
  }

  downloadUpdate(): Promise<UpdateState> {
    return this.provider.downloadUpdate();
  }

  installUpdate(): Promise<UpdateInstallResult> {
    return this.provider.installUpdate();
  }

  subscribe(listener: UpdateStateListener): () => void {
    return this.provider.subscribe(listener);
  }
}

export const updateService = new UpdateService(electronUpdateProvider);
