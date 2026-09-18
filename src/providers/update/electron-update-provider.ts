import type { UpdateProvider } from './update-provider';

export const electronUpdateProvider: UpdateProvider = {
  getState: () => window.theCabinet.getUpdateState(),
  checkForUpdates: () => window.theCabinet.checkForUpdates(),
  downloadUpdate: () => window.theCabinet.downloadUpdate(),
  installUpdate: () => window.theCabinet.installUpdate(),
  subscribe: (listener) => window.theCabinet.onUpdateStateChanged(listener),
};
