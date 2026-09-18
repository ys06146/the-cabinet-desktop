import type { RuntimeInfoProvider } from './runtime-info-provider';

export const electronRuntimeInfoProvider: RuntimeInfoProvider = {
  getRuntimeInfo: () => window.theCabinet.getRuntimeInfo(),
};
