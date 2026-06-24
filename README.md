# KT 그레이드 대시보드

GitHub Pages에 올릴 수 있는 정적 HTML 대시보드입니다. 데이터 저장은 Google Sheets와 Apps Script Web App으로 연결합니다.

## 연결할 Google Spreadsheet

현재 Apps Script는 아래 스프레드시트에 저장되도록 고정되어 있습니다.

- Spreadsheet ID: `1IhG3NBOWwbFeIHSPgdKxEAASQXInnEwe_c36W8M27YM`
- 저장 시트명: `KT_DASHBOARD`
- Web App URL: `https://script.google.com/macros/s/AKfycbzhJe3MCeBzP0tvcY_L0ohEe8XPoOdl3VI8YLODu8AtMFlgtkQfSxLviZZvWXh0Yuf8/exec`

`KT_DASHBOARD` 시트가 없으면 Apps Script가 자동으로 생성합니다.

## 현재 구현된 기능

- 날짜별 데이터 직접 입력
- 조회 기준일과 보고 월을 분리해 월별 데이터 조회 및 누적
- 헤더에서 인터넷 목표 건수와 마감일 설정
- 목표 건수, 마감일, 품목별 개통율을 Google Sheets `SETTINGS` 시트에 저장
- 인터넷 / TV / 유심 / 기기 개통율 설정
- 마감일까지 남은 영업일수 자동 계산
- 개통 완료 / 가설중 상태 분리
- 온라인 / 도매 경로별 인터넷, TV, 메인TV, 추가단말 입력
- 모바일 기기(M) / 유심(U)은 경로 구분 없이 통합 입력
- 온라인 / 도매별 완료 인터넷, 가설 인터넷, 개통예상 인터넷 자동 계산
- 모바일 합계, 번들율, 목표 달성률 자동 계산
- 같은 날짜 저장 시 기존 행 덮어쓰기
- 오늘 데이터와 정확히 하루 전 날짜 데이터 비교
- 월 누적 요약과 일별 데이터를 정리한 보고용 Excel 파일 다운로드

남은 영업일수는 선택한 날짜부터 마감일까지 포함해서 계산하며, 토요일/일요일과 `app.js`의 `KOREA_HOLIDAYS` 목록에 있는 공휴일을 제외합니다.

완료/가설 번들율은 각각 `인터넷 ÷ 메인TV`로 계산합니다. 완료 동판율은 `(완료 기기 + 완료 유심) ÷ 인터넷 총 개통예상`, 가설 동판율은 `(가설 기기 + 가설 유심) ÷ 인터넷 총 개통예상`으로 계산합니다.

## 파일

- `index.html`: 요약 대시보드 화면
- `input.html`: 일별 입력 화면
- `styles.css`: 화면 스타일
- `app.js`: 계산, 저장, 조회, 전날 비교 로직
- `apps-script/Code.gs`: Google Sheets에 붙일 Apps Script 코드
- `start-local-server.bat`: 로컬 테스트용 서버 실행 파일
- `start-local-server.ps1`: 로컬 테스트용 서버 스크립트

## 로컬 테스트

Google Apps Script 연동은 `file://`로 `index.html`을 직접 열면 브라우저 보안 제한에 걸릴 수 있습니다. 로컬에서는 PowerShell에서 아래 명령으로 서버를 띄운 뒤 접속하세요.

```powershell
.\start-local-server.bat
```

`.ps1` 직접 실행이 막혀도 `.bat` 파일은 실행 정책 우회 옵션을 붙여 서버를 실행합니다.

접속 주소:

```text
http://localhost:5500/
```

이미 5500 포트가 사용 중이면 스크립트가 5501, 5502처럼 다음 빈 포트로 실행합니다. 터미널에 표시되는 주소로 접속하세요.

## Google Sheets 연결 순서

1. 연결할 스프레드시트에서 `확장 프로그램 > Apps Script`를 엽니다.
2. `apps-script/Code.gs` 내용을 Apps Script 편집기에 붙여넣고 저장합니다.
3. `배포 > 새 배포 > 웹 앱`을 선택합니다.
4. 실행 권한은 `본인`으로 설정합니다.
5. 액세스 권한은 `모든 사용자`로 설정합니다.
6. 배포 후 생성되는 Web App URL을 `config.js`의 `apiUrl`에 넣습니다.

주의: Google Sheets 공유 링크가 아니라 Apps Script의 Web App URL을 입력해야 합니다.
현재 대시보드에는 위 Web App URL이 `config.js`에 들어가 있어서 화면에서 별도로 입력하지 않아도 됩니다.

`401 Unauthorized`가 보이면 웹 앱 액세스 권한이 막힌 상태입니다. Apps Script에서 배포 권한을 `모든 사용자`로 바꾸고 새 버전으로 다시 배포해야 합니다.

## 재배포

`apps-script/Code.gs`를 수정한 뒤에는 Apps Script에서 새 버전으로 다시 배포해야 GitHub Pages 화면에 반영됩니다.

## 저장 방식

대시보드는 `config.js`의 Web App URL을 통해 위 스프레드시트를 DB처럼 사용합니다.

같은 날짜 데이터는 새 행을 추가하지 않고 기존 행을 덮어씁니다.

인터넷 목표, 온라인 목표, 목표 Point, 마감일, 개통율 설정은 `SETTINGS` 시트의 `B1:B9` 영역에 저장됩니다.
