/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const readComponent = (name: string): string =>
  readFileSync(new URL(`./components/${name}`, import.meta.url), 'utf8');

const workbenchSource = readComponent('GameProjectWorkbench.tsx');
const sceneSource = readComponent('SceneEditor.tsx');
const scriptsSource = readComponent('ScriptsPanel.tsx');
const assetsSource = readComponent('GameAssetTree.tsx');
const workspaceDomainSource = readFileSync(
  new URL('../../domain/game-project-workspace.ts', import.meta.url),
  'utf8',
);
const assetContractSource = assetsSource + workspaceDomainSource;
const tasksSource = readComponent('TasksPanel.tsx');
const previewSource = readComponent('PreviewPanel.tsx');
const workspaceHookSource = readFileSync(
  new URL('../../hooks/use-game-project-workspace.ts', import.meta.url),
  'utf8',
);
const modifierSource = readFileSync(
  new URL('../../app/services/mock-code-modification-service.ts', import.meta.url),
  'utf8',
);

describe('Stage 6 Game Project workbench contracts', () => {
  it('exposes the seven requested keyboard-navigable project menus', () => {
    for (const label of [
      'Overview',
      'Game Design',
      'Scene',
      'Scripts',
      'Assets',
      'Tasks',
      'Preview',
    ]) {
      expect(workbenchSource).toContain(`label: '${label}'`);
    }
    expect(workbenchSource).toContain('role="tablist"');
    expect(workbenchSource).toContain("event.key === 'ArrowRight'");
    expect(workbenchSource).toContain('hidden={activeTab !==');
    expect(workbenchSource).toContain('<PreviewPanel active={activeTab ===');
  });

  it('provides all Scene objects, tools, Inspector fields, and Korean Unity explanations', () => {
    for (const label of [
      '플레이어',
      '적',
      '바닥',
      '장애물',
      '아이템',
      '카메라',
      'UI',
      '선택',
      '이동',
      '크기 변경',
      '삭제',
      '격자',
      '실행',
      '이름',
      '위치',
      '크기',
      '이동 속도',
      '충돌 여부',
      '중력 여부',
    ]) {
      expect(sceneSource).toContain(label);
    }
    expect(sceneSource).toContain('Collider 2D:');
    expect(sceneSource).toContain('Gravity Scale:');
  });

  it('keeps example Assets virtual and explains every requested script concern', () => {
    for (const path of [
      'Scenes/',
      'MainScene.unity',
      'Scripts/',
      'PlayerMovement.cs',
      'GameManager.cs',
      'Collectible.cs',
      'Prefabs/',
    ]) {
      expect(assetContractSource).toContain(path);
    }
    for (const heading of [
      '코드가 하는 일',
      '사용자가 변경해도 되는 값',
      '변경 위험이 있는 부분',
      'Unity에서 연결할 객체',
      '자주 발생하는 오류',
    ]) {
      expect(scriptsSource).toContain(heading);
    }
    expect(scriptsSource).toContain('외부 LLM이나 Unity API를 호출하지 않는');
    for (const example of [
      '캐릭터를 빠르게 해줘',
      '점프 기능을 넣어줘',
      '아이템 10개를 모으면 끝내줘',
    ]) {
      expect(modifierSource).toContain(example);
    }
  });

  it('shows every required Task field and a controlled completion checkbox', () => {
    for (const field of ['상태', '난이도', '구현 순서', '관련 Scene', '관련 Script', '완료 체크']) {
      expect(tasksSource).toContain(field);
    }
    expect(tasksSource).toContain('checked={task.completed}');
    expect(tasksSource).toContain("status: completed ? 'done' : 'todo'");
  });

  it('marks Preview as a browser prototype and provides the complete keyboard game UI', () => {
    for (const text of [
      'Browser Canvas Prototype',
      'Unity 결과 아님',
      '현재 점수',
      '일시정지',
      '다시 시작',
      '사운드',
      'WASD',
      '방향키',
      '전체 수집 완료',
    ]) {
      expect(previewSource).toContain(text);
    }
    expect(previewSource).toContain('role="application"');
    expect(previewSource).toContain('tabIndex={0}');
    expect(previewSource).toContain('data-preview-player-x');
    expect(previewSource).toContain("KeyW: 'up'");
  });

  it('persists editor state through a hook and keeps Renderer filesystem access absent', () => {
    expect(workspaceHookSource).toContain('gameProjectDataService.saveWorkspace');
    expect(workspaceHookSource).not.toContain('window.theCabinet');
    for (const source of [workbenchSource, sceneSource, scriptsSource, tasksSource, previewSource]) {
      expect(source).not.toContain('node:fs');
      expect(source).not.toContain('window.theCabinet');
    }
  });
});
