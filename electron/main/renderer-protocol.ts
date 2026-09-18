import { net, protocol } from 'electron';
import { isAbsolute, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const RENDERER_SCHEME = 'cabinet';
export const PRODUCTION_RENDERER_URL = `${RENDERER_SCHEME}://renderer/index.html`;

export function registerRendererSchemePrivileges(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: RENDERER_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
      },
    },
  ]);
}

export function resolveRendererAssetPath(
  rendererRoot: string,
  requestUrl: string,
): string | null {
  try {
    const url = new URL(requestUrl);
    if (url.protocol !== `${RENDERER_SCHEME}:` || url.host !== 'renderer') {
      return null;
    }

    const pathname = decodeURIComponent(url.pathname);
    const requestedPath = pathname === '/' ? '/index.html' : pathname;
    const assetPath = resolve(rendererRoot, `.${requestedPath}`);
    const relativePath = relative(rendererRoot, assetPath);
    if (
      relativePath.length === 0 ||
      relativePath.startsWith('..') ||
      isAbsolute(relativePath)
    ) {
      return null;
    }
    return assetPath;
  } catch {
    return null;
  }
}

export function installRendererProtocol(rendererRoot: string): void {
  protocol.handle(RENDERER_SCHEME, (request) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 });
    }

    const assetPath = resolveRendererAssetPath(rendererRoot, request.url);
    if (!assetPath) {
      return new Response('Not found', { status: 404 });
    }
    return net.fetch(pathToFileURL(assetPath).toString());
  });
}
