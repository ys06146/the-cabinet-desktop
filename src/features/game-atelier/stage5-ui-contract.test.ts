/// <reference types="node" />

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const startSource = readFileSync(new URL('./components/GameAtelierStart.tsx', import.meta.url), 'utf8');
const chatSource = readFileSync(new URL('./components/GameIdeationChat.tsx', import.meta.url), 'utf8');
const projectSource = readFileSync(new URL('./components/GameProjectView.tsx', import.meta.url), 'utf8');
const shelfSource = readFileSync(new URL('./components/GameProjectShelf.tsx', import.meta.url), 'utf8');
const atelierSource = readFileSync(new URL('./GameAtelier.tsx', import.meta.url), 'utf8');
const hookSource = readFileSync(new URL('../../hooks/use-game-atelier.ts', import.meta.url), 'utf8');
const appSource = readFileSync(new URL('../../app/App.tsx', import.meta.url), 'utf8');

describe('Stage 5 Game Atelier Renderer contracts', () => {
  it('provides the requested start prompt through domain-owned templates and examples', () => {
    expect(startSource).toContain('어떤 게임을 만들어보고 싶으신가요?');
    expect(startSource).toContain('GAME_IDEA_TEMPLATES.map');
    expect(startSource).toContain('GAME_IDEA_EXAMPLES.map');
    expect(startSource).toContain('GAME_IDEATION_LIMITS.maxInitialIdeaCharacters');
    expect(startSource).toContain('Mock AI');
  });

  it('renders only the active question and restores input focus as the turn advances', () => {
    expect(chatSource).toContain('turn.question.prompt');
    expect(chatSource).not.toContain('GAME_IDEATION_QUESTIONS.map');
    expect(chatSource).toContain('key={turn.question.id}');
    expect(chatSource).toContain(
      'aria-labelledby="game-ideation-answer-label game-ideation-current-question"',
    );
    expect(chatSource).toContain('role="progressbar"');
    expect(chatSource).toContain('Mock AI · Current question');
    expect(chatSource).toContain('break-words whitespace-pre-wrap');
  });

  it('shows every requested overview and game design field', () => {
    for (const label of [
      '게임 제목',
      '한 줄 설명',
      '장르',
      '핵심 행동',
      '승리 조건',
      '실패 조건',
      '예상 플레이 시간',
      '현재 완성도',
      '다음 작업',
      '게임 목표',
      '플레이 흐름',
      '핵심 규칙',
      '조작',
      '난이도 변화',
      '점수 체계',
      '종료 조건',
      '최소 기능 버전',
      '나중에 추가할 기능',
    ]) {
      expect(projectSource).toContain(`label="${label}"`);
    }
    expect(projectSource).toContain('Mock AI generated');
    expect(projectSource).toContain('저장됨 · 재실행 후 복원 가능');
    expect(projectSource).toContain('break-all font-mono');
  });

  it('keeps Midnight Archive available while distinguishing built-in and stored projects', () => {
    expect(shelfSource).toContain("project.id === 'midnight-archive'");
    expect(shelfSource).toContain('기본 프로젝트');
    expect(projectSource).toContain('앱에 포함된 기본 프로젝트');
    expect(projectSource).toContain('사용자 데이터에 로컬 저장');
  });

  it('uses application services and does not access Electron or providers from UI', () => {
    expect(hookSource).toContain('gameAtelierService');
    expect(hookSource).toContain('gameProjectDataService');
    expect(hookSource).not.toContain('window.theCabinet');
    expect(hookSource).not.toContain('providers/mock');
    expect(appSource).toContain("import { GameAtelier } from '../features/game-atelier/GameAtelier'");
    expect(appSource).toContain('return <GameAtelier />');
    expect(atelierSource).not.toContain('<main');
  });
});
