# The Cabinet 출시 준비 검토

검토일: 2026-07-31  
대상 버전: 0.1.0  
결론: **공개 배포 보류**

이 문서는 Stage 9 안정화 결과를 기록한다. 새 기능 범위는 포함하지 않으며, 실제 태그나 GitHub Release를 생성하지 않았다.

## 배포 판단

로컬 Production build와 Windows x64 NSIS 패키징은 성공한다. 핵심 사용자 데이터 저장·재실행 복원, Market Research JSON 왕복, Game Project 생성과 Preview 실행도 패키징된 앱에서 통과했다.

다만 현재 설정된 공개 업데이트 저장소가 비인증 요청에 HTTP 404를 반환하고, 작업공간에 Git 메타데이터가 없으며, 실제 `v0.1.0 → v0.1.1` 설치 업데이트 수용 시험을 수행하지 못했다. Setup과 앱 실행 파일도 서명되지 않았다. 따라서 현재 산출물을 공개 자동 업데이트 채널에 배포할 수 있다고 승인하지 않는다.

## 심각도별 결과

### Blocker

1. **공개 업데이트 저장소 접근 불가**
   - 패키지는 `ys06146/the-cabinet-desktop` GitHub Release를 조회하도록 구성되어 있다.
   - 비인증 GitHub 웹/API 요청은 404를 반환했다. 최종 사용자 앱에는 토큰이 없으므로 공개 접근 가능한 저장소와 Release가 필수다.
   - 해결 조건: 저장소를 실제 공개 저장소로 준비하고, 패키지의 owner/repo와 workflow 실행 저장소가 일치하는지 확인한다.

2. **실제 설치 업데이트 수용 시험 미완료**
   - 현재 작업공간에는 `.git`이 없어 태그·Actions·Release 연결을 검증할 수 없다.
   - 사용자의 지시에 따라 실제 태그와 Release를 만들지 않았다.
   - 해결 조건: 깨끗한 Windows x64 VM에서 서명된 v0.1.0을 설치한 뒤 공개 v0.1.1로 업데이트하고, 데이터 보존과 실패 복구 행렬을 모두 통과한다.

### High

1. **Windows 코드 서명과 updater 게시자 인증 부재**
   - Setup EXE와 `The Cabinet.exe`는 `NotSigned`다.
   - `publisherName`이 없어 updater의 Authenticode 게시자 검증도 활성화되지 않는다.
   - 해결 조건: 신뢰 가능한 코드 서명 인증서를 Release workflow에 Secret으로 연결하고, Release 빌드에서 서명을 강제하며, 두 EXE의 서명이 `Valid`이고 예상 게시자 DN과 일치하는지 확인한다.

2. **NSIS 설치 시작 이후 자동 rollback 미보장**
   - 서버 조회, 다운로드, checksum, 사용자 데이터 저장, installer 실행 전 실패는 기존 앱을 유지한다.
   - 그러나 NSIS가 기존 버전을 제거한 뒤 디스크 부족·백신 차단·파일 복사 실패가 발생하는 구간은 기존 버전 자동 복구가 보장되지 않는다.
   - 해결 조건: 폐기 가능한 VM snapshot에서 설치 중 실패를 주입하고, 기존 버전 실행 또는 승인된 복구 절차를 검증한다.

### Medium

- updater 이벤트와 요청 ID가 원천적으로 결합되지 않아 이전 check의 늦은 이벤트가 새 재시도에 귀속될 가능성이 있다.
- 전체 `npm audit`은 `brace-expansion` GHSA 한 건이 빌드 도구 트리로 전파되어 16 High를 표시한다. 설치 트리는 maintenance backport 1.1.18/2.1.4/5.0.9를 사용하고 호환 호출과 제한 패치를 확인했으며, `npm audit --omit=dev`는 0건이다. Release 전에 예외 근거를 다시 검토해야 한다.
- Preview는 실행 중 매 animation frame마다 React state를 만들 수 있어 장시간 유휴 실행 시 CPU와 commit 수가 높아질 수 있다.
- Preview Canvas backing store는 DPR 보정이 없어 125%·150%에서 흐릴 수 있다. Scene Canvas는 DPR을 처리한다.
- Scene drag와 차트 pointer 이동은 이벤트마다 큰 React 렌더를 유발할 수 있다.
- 다른 배율의 모니터로 창을 이동할 때 최소 크기는 갱신되지만 현재 bounds를 즉시 work area 안으로 재배치하지 않는다.
- Market Research 저장 파일은 읽기 전에 byte 크기를 stat으로 제한하지 않는다. import 파일과 Game Atelier 저장 파일은 크기 제한이 있다.
- 로그는 동기 append이며 rotation과 총 크기 제한이 없다.
- Release workflow의 GitHub Actions 참조가 commit SHA가 아닌 major tag다.
- Canvas 게임은 키보드 설명과 점수 ARIA를 제공하지만 화면 읽기 사용자에게 수집물 위치를 동등하게 전달하지 않는다.
- 실제 한글 Windows 계정, 실제 125%·150% 배율, 물리 네트워크 어댑터 차단은 VM 수동 확인이 남아 있다. 실제 NSIS 사용자 지정 한글·공백 설치와 격리 userData smoke, 네트워크 차단 에뮬레이션은 통과했다.

### Low

- 일부 비동기 hook은 unmount 이후 유한한 state setter를 호출할 수 있다.
- 숨겨진 Workbench 패널이 계속 마운트되어 DOM과 observer 비용이 남는다.
- 일부 0.55rem~0.62rem 보조 글자가 작고 negative 색상은 작은 본문 AA 대비에 근소하게 못 미친다.
- Scene/Chart의 예외적인 `lostpointercapture` 정리 경로가 없다.
- `window-state.json`은 손상 시 기본값으로 복구하지만 원자 쓰기는 아니다.
- 앱 아이콘이 지정되지 않아 Electron 기본 아이콘이 사용된다.

## Stage 9에서 수정한 문제

- Electron 37 계열을 지원 중인 Electron 43.2.0으로 갱신했다.
- ESLint 도구 체인을 현재 호환 버전으로 갱신하고 경고 없이 통과하도록 설정했다.
- 구형 minimatch를 깨뜨리던 전역 `brace-expansion@5` override를 제거하고 major별 호환 maintenance backport를 lockfile에 반영했다.
- 일반 창 닫기에도 저장 장벽을 적용했다. 저장 실패 시 종료를 취소하고 사용자에게 오류를 알리며 재시도할 수 있다.
- 화면 이탈 중 실패한 저장 task와 payload를 보존해 다음 flush에서 재시도한다.
- 프로젝트 A에서 B로 전환할 때 A workspace가 B에 저장될 수 있던 비동기 경합을 차단했다.
- 고배율 work area가 기본 최소 크기보다 작을 때 초기·복원 창 크기를 화면 안으로 제한했다.
- Chromium permission check/request를 기본 거부하고, checkout credential 지속을 비활성화했다.
- RunAsNode, Node options, CLI inspect를 끄고 ASAR integrity와 OnlyLoadAppFromAsar를 켰다.
- Production Renderer를 제한된 `cabinet://renderer` custom protocol로 전환해 `file://` 추가 특권을 끈 상태에서도 패키지가 로드되도록 했다. 경로 이탈과 외부 host를 거부하며 IPC는 정확한 entry URL만 신뢰한다.

## 실제 QA 결과

- 첫 실행, Market Room 진입, NVIDIA/Apple 종목 전환, 1Y/3M 범위 전환: 통과.
- 뉴스 1건 저장, NVDA 메모 6개 필드와 다음 확인 날짜 저장: 통과.
- 정상 종료 후 같은 userData 재실행, 뉴스·메모·날짜 복원: 통과.
- 다섯 개 Mock AI 질문을 순차 응답해 `Rainwalk Seoul` 생성·저장·재실행 복원: 통과.
- Preview 시작 지연 약 4ms, 키보드 focus, 실행, 탭 왕복 상태 보존: 통과.
- Market Research JSON native 내보내기와 다시 가져오기/병합: 통과. Game Project JSON export/import는 현재 기능이 아니다.
- 320px viewport에서 문서 폭이 viewport를 넘지 않았고 Preview Canvas가 266px로 축소됨: 통과.
- 실제 NSIS를 사용자 지정 한글·공백 경로에 설치해 바로가기 생성, 설치본 smoke, 제거, 바로가기 정리, 격리 userData 보존을 확인했다. 모든 프로세스 Exit 0, 로그 오류·경고 0.
- 업데이트 서버/설정 접근 실패는 사용자에게 `업데이트 확인 오류`로 표시되고 앱 기능은 계속 동작함: 통과.
- DevTools 네트워크 차단 에뮬레이션에서도 로컬 Mock Market 흐름은 계속 동작했다. `navigator.onLine` 상태와 물리 NIC 차단은 별도 VM 확인 대상으로 남겼다.
- 강제 실패·지연 Mock Provider, invalid JSON, 저장·재실행은 단위 테스트로 통과.

## 코드 서명 없이 예상되는 사용자 경험

- Windows SmartScreen의 “Windows에서 PC를 보호했습니다” 화면이나 “알 수 없는 게시자” 경고가 나타날 수 있다.
- 조직의 App Control/보안 정책이 설치 또는 실행을 차단할 수 있다.
- 새 버전마다 평판을 다시 쌓아야 할 수 있으며 사용자는 게시자 신원을 확인할 수 없다.
- updater checksum은 전송 파일의 일치 여부를 확인하지만 서명된 게시자 신원을 대신하지 않는다.

## 실제 Release 전 반드시 수행할 항목

1. 공개 저장소와 `.git`/origin/Actions 실행 위치를 준비한다.
2. 코드 서명 인증서와 예상 `publisherName`을 구성하고 Release 빌드에서 unsigned 산출물을 실패 처리한다.
3. `npm ci`, lint, typecheck, test, build, `dist:win`, production dependency audit를 깨끗한 NTFS checkout에서 재실행한다.
4. Electron Fuse, Authenticode, `latest.yml` version/path/size/SHA-512, Setup SHA-256을 검증한다.
5. Windows 100%·125%·150%, 작은 work area, 한글 계정, 한글 설치 경로에서 NSIS 첫 설치와 덮어쓰기를 확인한다.
6. `docs/UPDATE_VERIFICATION.md`의 v0.1.0→v0.1.1 성공·실패·rollback 절차를 VM snapshot에서 수행한다.
7. GitHub Release가 공개 Published 상태이고 Setup, blockmap, `latest.yml`이 변경 불가능한 자산으로 일치하는지 확인한다.

## 다음 버전으로 미룰 항목

- Game Project JSON 내보내기/가져오기.
- Preview DPR 보정과 유휴 animation 최적화.
- Canvas 화면 읽기 대체 경험.
- 로그 rotation, Market 저장 파일 pre-read 크기 제한, 모니터 이동 bounds 재배치.
- GitHub Actions commit SHA pinning과 불완전 Release 자동 정리 정책.
- 사용자 지정 Windows 아이콘, 검색 실행, Saved Items/Notes 집계, 실제 API·LLM·Unity 연결.
