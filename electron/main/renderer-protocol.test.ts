import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  PRODUCTION_RENDERER_URL,
  resolveRendererAssetPath,
} from './renderer-protocol';

const rendererRoot = resolve('C:/The Cabinet/resources/app/dist/renderer');

describe('renderer protocol path boundary', () => {
  it('maps the entry page and packaged assets inside the renderer root', () => {
    expect(resolveRendererAssetPath(rendererRoot, PRODUCTION_RENDERER_URL)).toBe(
      resolve(rendererRoot, 'index.html'),
    );
    expect(
      resolveRendererAssetPath(
        rendererRoot,
        'cabinet://renderer/assets/index-abc123.js',
      ),
    ).toBe(resolve(rendererRoot, 'assets/index-abc123.js'));
  });

  it('rejects foreign hosts, malformed encoding, and traversal', () => {
    expect(
      resolveRendererAssetPath(rendererRoot, 'cabinet://external/index.html'),
    ).toBeNull();
    expect(
      resolveRendererAssetPath(rendererRoot, 'cabinet://renderer/%E0%A4%A'),
    ).toBeNull();
    expect(
      resolveRendererAssetPath(rendererRoot, 'cabinet://renderer/..%5Csecret.txt'),
    ).toBeNull();
  });
});
