export interface AppRuntimeInfo {
  appName: string;
  version: string;
  environment: 'development' | 'production';
  platform: string;
}
