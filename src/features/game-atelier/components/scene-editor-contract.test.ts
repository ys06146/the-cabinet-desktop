/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sceneSource = readFileSync(new URL('./SceneEditor.tsx', import.meta.url), 'utf8');

describe('Stage 6 Scene editor contracts', () => {
  it('exposes the exact requested object types and editor tools', () => {
    for (const label of ['플레이어', '적', '바닥', '장애물', '아이템', '카메라', 'UI']) {
      expect(sceneSource).toContain(`'${label}'`);
    }

    for (const label of ['선택', '이동', '크기 변경', '삭제']) {
      expect(sceneSource).toContain(`'${label}'`);
    }
    expect(sceneSource).toContain('>\n              격자\n');
    expect(sceneSource).toContain('>\n              실행\n');
  });

  it('provides all requested Inspector fields with plain Korean Unity explanations', () => {
    for (const label of ['이름', '위치', '크기', '이동 속도', '충돌 여부', '중력 여부']) {
      expect(sceneSource).toContain(label);
    }
    expect(sceneSource).toContain('Collider 2D: 서로 겹치거나 부딪히는 영역을 감지합니다.');
    expect(sceneSource).toContain('Gravity Scale: 객체를 아래로 끌어당기는 힘');
    expect(sceneSource).toContain('Inspector(속성 창)');
    expect(sceneSource).toContain('객체(GameObject)');
  });

  it('keeps Canvas editing keyboard accessible and Renderer-only', () => {
    expect(sceneSource).toContain('role="application"');
    expect(sceneSource).toContain('tabIndex={0}');
    expect(sceneSource).toContain('onKeyDown={handleCanvasKeyDown}');
    expect(sceneSource).toContain("event.key === 'Delete'");
    expect(sceneSource).toContain("event.key.startsWith('Arrow')");
    expect(sceneSource).toContain('aria-live="polite"');
    expect(sceneSource).not.toContain('window.theCabinet');
    expect(sceneSource).not.toContain('node:fs');
  });
});
