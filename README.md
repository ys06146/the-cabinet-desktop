# The Cabinet

The Cabinet은 비개발자를 위한 Windows 우선 개인 워크스페이스입니다. 금융 리서치를 정리하는 **Market Room**과 자연어 게임 아이디어를 작은 기획·코드·플레이 가능한 프로토타입으로 발전시키는 **Game Atelier**로 구성됩니다.

> 현재 버전: v0.1.2. 시세·차트·뉴스를 실제 데이터에 연결하고 주기적으로 갱신합니다. 투자 테마와 Game Atelier AI는 예시 기능입니다. 코드 서명과 실제 설치 업데이트 수용 시험은 남아 있습니다.

소스 저장소: [ys06146/the-cabinet-desktop](https://github.com/ys06146/the-cabinet-desktop)

설치 파일: [The Cabinet 최신 버전](https://github.com/ys06146/the-cabinet-desktop/releases/latest) · Windows x64 · 서명되지 않은 초기 배포판

앱 상단의 **자동 업데이트** 버튼으로 새 버전을 확인하고 설정 화면에서 다운로드와 재시작 설치를 진행할 수 있습니다. 설치형 앱은 시작 후에도 자동으로 새 버전을 확인합니다.

## 주요 공간

### Market Room

- 국내·미국 실제 시장 요약과 11개 관심 종목, 출처·시세 시각·지연 표시
- OHLCV 캔들 차트, 거래량, SMA·RSI·MACD 계산
- 규칙 기반 차트 분석, 최신 뉴스 제목·원문 링크, 예시 투자 테마
- 종목별 투자 메모 저장 및 Market Research JSON 내보내기·가져오기

### Game Atelier

- 규칙 기반 Mock AI 질문을 이용한 Game Project 생성
- Overview, Game Design, Scene, Scripts, Assets, Tasks, Preview 작업 화면
- Scene·Script·Task 상태 저장
- 키보드로 플레이할 수 있는 브라우저 Canvas 아이템 수집 프로토타입

Market Room은 시세를 1분, 뉴스를 5분마다 확인합니다. 네이버 금융·Yahoo Finance·Google News RSS를 사용하며 휴장·공급 지연과 연결 실패를 표시합니다. 자세한 동작은 [실제 데이터 안내](docs/LIVE_DATA.md)를 참고하세요. LLM·Unity API·로그인·투자 주문 기능은 연결되어 있지 않습니다.

## 기술 스택

- Electron, React, TypeScript, Vite
- Tailwind CSS
- Vitest, ESLint
- electron-builder, electron-updater
- Windows x64, NSIS installer
- GitHub Actions CI 및 태그 기반 Windows Release

## 빠른 시작

요구 사항:

- 현재 Node.js LTS
- npm 10 이상
- NSIS 패키징은 Windows x64

의존성이 큰 프로젝트이므로 가능하면 로컬 NTFS checkout에서 실행하세요. 일부 클라우드 가상 드라이브는 `node_modules` 압축 해제와 실행이 불안정할 수 있습니다.

```bash
npm ci
npm run dev
```

개발 환경에서는 Vite Renderer와 Electron이 함께 실행되고 DevTools가 자동으로 열립니다. 자동 업데이트 검사는 실행하지 않습니다.

## 명령

| 명령 | 용도 |
| --- | --- |
| `npm run dev` | 개발 서버와 Electron 실행 |
| `npm run lint` | ESLint 검사 |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm run test` | Vitest 단위 테스트 |
| `npm run build` | Renderer·Main·Preload Production build |
| `npm run dist:win` | Windows x64 NSIS 설치 프로그램 생성 |

전체 로컬 품질 검사는 다음 순서로 실행합니다.

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

## Windows 설치 프로그램

```bash
npm run dist:win
```

이 명령은 `--publish never`로 실행되어 GitHub Release를 만들거나 수정하지 않습니다.

```text
release/
├─ The-Cabinet-Setup-<version>.exe
├─ The-Cabinet-Setup-<version>.exe.blockmap
├─ latest.yml
└─ win-unpacked/
```

- Portable build는 만들지 않습니다.
- 설치 위치를 선택할 수 있습니다.
- 바탕화면과 시작 메뉴 바로가기를 생성합니다.
- 앱 코드와 사용자 데이터는 서로 다른 위치에 저장됩니다.

## 사용자 데이터

사용자 데이터는 Electron `userData` 아래에 저장되므로 앱 버전이 바뀌어도 유지됩니다.

- `market-research-data.json`: 투자 메모와 저장 뉴스
- `game-atelier-data.json`: Game Project, Scene·Script·Task workspace
- 미완료 Game Atelier 입력: 제한된 Chromium 사용자 저장소

Market Research 데이터는 JSON 내보내기·가져오기를 지원합니다. Game Project JSON 내보내기·가져오기는 아직 구현하지 않았습니다.

## 데스크톱 보안 경계

- `contextIsolation: true`, `nodeIntegration: false`, Renderer sandbox 사용
- Renderer에서 Node.js와 파일 시스템 직접 접근 금지
- 명시적으로 제한된 Preload API와 IPC 채널만 노출
- Production 콘텐츠는 경로가 제한된 `cabinet://renderer` 프로토콜로 로드
- 새 창, 임의 navigation, webview 차단. 확인한 뉴스 ID의 HTTPS 기사 링크만 기본 브라우저에서 열기 허용
- GitHub 토큰·인증서·비밀 값을 앱 코드와 패키지에 포함하지 않음

## 버전과 Release 준비

버전은 `package.json`, `package-lock.json`, Git 태그가 정확히 일치해야 합니다.

```bash
npm version 0.1.1 --no-git-tag-version
npm run lint
npm run typecheck
npm run test
npm run dist:win
```

검증 후 승인된 Release에서만 태그를 생성합니다.

```bash
git add package.json package-lock.json
git commit -m "release: v0.1.1"
git tag -a v0.1.1 -m "The Cabinet v0.1.1"
git push origin main
git push origin v0.1.1
```

`v*.*.*` 태그가 push되면 `.github/workflows/release-windows.yml`이 Windows에서 품질 검사를 다시 실행하고 다음 파일을 Published GitHub Release에 게시합니다.

- Setup EXE
- EXE blockmap
- `latest.yml`

태그를 재사용하거나 이미 게시한 Release 자산을 교체하지 마세요.

## 자동 업데이트 확인

자동 업데이트는 설치된 packaged app과 더 높은 공개 Release가 있어야 검증할 수 있습니다. 개발 환경에서는 동작하지 않습니다.

1. v0.1.0을 설치하고 메모와 Game Project를 만듭니다.
2. 버전과 태그가 일치하는 v0.1.1 Published Release를 준비합니다.
3. v0.1.0을 다시 실행해 자동 또는 수동 업데이트 확인을 수행합니다.
4. 다운로드 진행률과 재시작 확인을 점검합니다.
5. v0.1.1 재실행 후 버전과 기존 사용자 데이터 보존을 확인합니다.
6. 서버·다운로드·저장·설치 실패 시나리오를 별도 Windows VM snapshot에서 검증합니다.

## 현재 공개 배포 상태

이전 Stage 9에서 로컬 Production build, Windows x64 NSIS, 핵심 사용자 흐름, 저장·재실행 복원, 한글·공백 경로 설치를 검증했습니다. v0.1.1 초기 공개 이후 v0.1.2에서 실제 시세·뉴스와 자동 갱신을 연결했습니다. 아래 항목은 현재 배포의 알려진 한계이며, 검증 완료로 간주하지 않습니다.

- 릴리스는 설치 파일·blockmap·`latest.yml`을 제공합니다. 자동 업데이트는 설치된 앱에서 더 높은 버전이 공개되었을 때 동작합니다.
- 실제 v0.1.0→v0.1.1 GitHub 업데이트 수용 시험 미완료
- Setup과 앱 실행 파일의 Windows 코드 서명 부재
- 설치 중 실패 시 기존 버전 rollback의 VM 검증 미완료

실제 태그나 GitHub Release를 만들기 전에 다음 문서를 확인하세요.

- [프로젝트 현재 상태](docs/PROJECT_STATE.md)
- [설계 결정 기록](docs/DECISIONS.md)
- [출시 준비 검토](docs/RELEASE_READINESS.md)
- [업데이트 검증 절차](docs/UPDATE_VERIFICATION.md)
- [Release Checklist](docs/RELEASE_CHECKLIST.md)
- [다음 작업](docs/NEXT_STEP.md)
