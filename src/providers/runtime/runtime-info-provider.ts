import type { AppRuntimeInfo } from '../../domain/runtime';

export interface RuntimeInfoProvider {
  getRuntimeInfo: () => Promise<AppRuntimeInfo>;
}
