/// <reference types="vite/client" />

import type { CabinetBridge } from '../electron/shared/ipc';

declare global {
  interface Window {
    readonly theCabinet: CabinetBridge;
  }
}

export {};
