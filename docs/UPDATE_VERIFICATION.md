# The Cabinet 실제 업데이트 검증 절차

이 문서는 설치형 Windows 앱의 `v0.1.0 → v0.1.1` 업데이트를 검증하는 운영 절차다. 태그 생성이나 Release 게시 권한을 부여하지 않으며, 실제 사용자 데이터 대신 폐기 가능한 Windows x64 VM과 전용 계정을 사용한다.

## 1. 사전 조건

- `ys06146/the-cabinet-desktop`가 인증 없이 읽을 수 있는 공개 저장소다.
- v0.1.0과 v0.1.1의 `package.json`, `package-lock.json`, tag가 각각 정확히 일치한다.
- 두 버전은 동일한 `appId: com.thecabinet.desktop`와 설치형 NSIS target을 사용한다.
- Setup EXE와 앱 EXE가 예상 게시자로 Authenticode `Valid`다.
- 깨끗한 Windows x64 VM, 업데이트 직전 snapshot, 100%·125%·150% 배율 테스트 계정을 준비한다.
- 설치 프로그램, blockmap, `latest.yml`의 hash와 크기를 기록한다.
- 이 절차의 JSON은 Market Research 데이터만 의미한다. Game Project JSON export/import는 현재 지원하지 않는다.

## 2. v0.1.0 기준선 만들기

1. 공개 Published Release에서 v0.1.0 Setup을 내려받고 SHA-256과 서명을 확인한다.
2. 첫 설치에서 사용자 지정 설치 위치를 선택하고 바탕화면·시작 메뉴 바로가기를 확인한다.
3. 앱을 실행해 사이드바와 Settings가 v0.1.0을 표시하는지 확인한다.
4. Market Room에서 종목과 차트 범위를 전환하고 뉴스 한 건을 저장한다.
5. 한글 투자 메모를 작성한다. 특히 “생각이 틀렸다고 판단할 조건”과 다음 확인 날짜를 채운다.
6. Market Research JSON을 한글 경로로 내보낸 뒤 다시 가져와 개수와 메모 내용을 확인한다.
7. Game Atelier에서 다섯 질문에 순차 응답해 새 프로젝트를 만든다.
8. Scene/Script/Task 중 하나를 수정하고 Preview를 시작한다.
9. 창 크기와 위치를 변경하고 앱을 정상 종료한 뒤 재실행한다.
10. 뉴스, 메모, 프로젝트, workspace, 창 상태가 복원되는지 확인한다.
11. `%APPDATA%\The Cabinet`을 별도 위치에 복사하고 파일 hash·크기를 기준 증거로 기록한다.

## 3. v0.1.1 Release 게시 검증

1. 별도 승인 후 v0.1.1 버전 변경 commit을 `main`에 반영한다.
2. tag가 정확히 `v0.1.1`이고 package version이 `0.1.1`인지 확인한 뒤 tag를 게시한다.
3. `Release Windows` workflow가 lint, typecheck, test, build와 `electron-builder --win --x64 --publish always`를 모두 통과했는지 확인한다.
4. Release가 draft/prerelease가 아닌 공개 Published 상태인지 확인한다.
5. `The-Cabinet-Setup-0.1.1.exe`, matching blockmap, `latest.yml`이 모두 있는지 확인한다.
6. `latest.yml`의 version, path, size, SHA-512를 실제 Setup과 대조한다.
7. 게시 후 자산을 교체하지 않는다. 수정이 필요하면 더 높은 patch 버전을 만든다.

## 4. 업데이트 성공 경로

1. 기준선 v0.1.0을 실행하고 15초 이상 기다리거나 Settings의 “업데이트 확인”을 누른다.
2. v0.1.1 업데이트 가능 상태가 표시되는지 확인한다.
3. 자동 다운로드가 시작되지 않는지 확인한다.
4. 사용자가 직접 다운로드하고 진행률과 다운로드 완료 상태를 확인한다.
5. 한 번은 “나중에” 또는 native 확인 취소를 선택해 앱이 계속 실행되는지 확인한다.
6. 다시 설치를 선택하기 직전에 메모, workspace, 프로젝트, 미완료 Game Atelier 입력을 변경한다.
7. 재시작 설치를 승인하고 저장 장벽이 모두 완료된 뒤에만 앱이 종료되는지 확인한다.
8. NSIS 설치가 완료된 뒤 앱을 재실행한다.
9. 사이드바와 Settings가 v0.1.1을 표시하는지 확인한다.
10. 기존 뉴스, 메모, Market Research 데이터, 프로젝트, workspace, 미완료 입력, 창 상태가 유지되는지 확인한다.
11. 다시 업데이트를 확인해 새 버전 없음 상태가 표시되는지 확인한다.
12. `%APPDATA%\The Cabinet`의 논리 데이터와 기준 증거를 비교한다. Chromium cache처럼 바뀌는 파일은 제외한다.

## 5. 실패 경로

각 시나리오는 별도의 VM snapshot에서 수행한다.

| 시점 | 주입 방법 | 기대 결과 |
| --- | --- | --- |
| 확인 전 | GitHub/인터넷 차단 | 이해 가능한 오류, 앱과 데이터 유지, 연결 복구 후 재시도 가능 |
| 다운로드 중 | 연결 차단 | 오류 표시, v0.1.0 계속 실행, 손상 파일 미설치 |
| 검증 | 잘못된 SHA-512를 제공하는 격리 feed | 설치 전 거부, v0.1.0 계속 실행 |
| 저장 장벽 | 테스트 전용 저장 실패·timeout | 설치 중단, 앱 계속 실행, 입력 유지 |
| installer 시작 | installer 실행 권한/파일 차단 | 오류 또는 다음 실행 가능, 기존 v0.1.0 확인 |
| 기존 버전 제거 후 | 디스크 부족·AV 파일 차단 | 승인된 rollback/복구 절차로 기존 버전 또는 정상 재설치 가능 |

마지막 행은 자동 rollback이 보장되지 않는 고위험 구간이다. 기존 버전 실행 또는 승인된 복구 절차가 검증되지 않으면 Release를 승인하지 않는다.

## 6. Windows 호환성 행렬

- 배율: 100%, 125%, 150%.
- 화면: 1920×1080, 1366×768, work area가 1100×700보다 작은 고배율 환경.
- 계정: ASCII 사용자 이름, 한글 사용자 이름, 공백이 포함된 프로필 경로.
- 설치: 기본 경로, `C:\앱 테스트\The Cabinet` 같은 한글 사용자 지정 경로.
- 데이터 파일: `C:\사용자 자료\투자 메모.json` 같은 한글 import/export 경로.
- 네트워크: 정상, 완전 offline, GitHub만 차단, 다운로드 중 단절.
- 보안: SmartScreen, 표준 사용자, 조직 App Control이 있는 관리 환경.

## 7. 증거 기록

- commit SHA, tag, CI와 Release workflow URL.
- GitHub Release URL과 Published 상태 화면.
- Setup SHA-256, Authenticode signer/status/timestamp.
- `latest.yml` 원문과 Setup path/size/SHA-512 비교 결과.
- v0.1.0/v0.1.1 버전 화면, 업데이트 진행률, 오류 화면.
- userData 전후 비교, 메모·프로젝트·workspace 복원 화면.
- 배율, 계정명 유형, 설치 경로, VM snapshot 이름.
- 실패 주입 방법, 결과, rollback 또는 복구 시간.

## 8. Release 승인 기준

모든 성공 경로가 통과하고, 실패 경로가 사용자 데이터를 손상하지 않으며, 설치 중 실패의 복구 절차가 실제로 동작하고, 서명·공개 feed·Published 자산 검증이 완료되어야 한다. 하나라도 충족하지 못하면 더 높은 patch 버전으로 수정한 뒤 전체 절차를 처음부터 반복한다.
