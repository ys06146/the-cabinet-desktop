import type { AppRuntimeInfo } from '../../domain/runtime';
import { electronRuntimeInfoProvider } from '../../providers/runtime/electron-runtime-info-provider';
import type { RuntimeInfoProvider } from '../../providers/runtime/runtime-info-provider';

export class RuntimeInfoService {
  constructor(private readonly provider: RuntimeInfoProvider) {}

  load(): Promise<AppRuntimeInfo> {
    return this.provider.getRuntimeInfo();
  }
}

export const runtimeInfoService = new RuntimeInfoService(electronRuntimeInfoProvider);
