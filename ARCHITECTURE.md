# 프로젝트 구조

이 프로젝트는 설치 없이 브라우저와 GitHub Pages에서 실행되는 정적 웹 앱입니다.
React/Vite 같은 빌드 도구가 없어도 배포할 수 있으며, 사용자는 공개 링크만 열면 됩니다.

## 파일별 책임

- `index.html`: 조회 대시보드의 마크업만 담당
- `input.html`: 데이터 입력 화면의 마크업만 담당
- `styles.css`: 색상, 간격, 반응형 레이아웃만 담당
- `app.js`: 입력 계산, 렌더링, Google Sheets 통신 담당
- `report-export.js`: 보고용 Excel 파일의 시트 구성과 다운로드 담당
- `config.js`: Apps Script 주소와 통신 제한 시간 등 배포 설정 담당
- `apps-script/Code.gs`: Google Sheets를 읽고 쓰는 서버 역할
- `.github/workflows/deploy-pages.yml`: `main` 브랜치를 GitHub Pages에 자동 배포

## 수정 규칙

1. 화면 문구나 순서를 바꿀 때는 HTML만 수정하고 기존 `id`는 유지합니다.
2. 크기, 색상, 배치는 `styles.css`만 수정합니다. HTML에 인라인 스타일을 넣지 않습니다.
3. Apps Script 주소를 바꿀 때는 `config.js`만 수정합니다.
4. 계산식을 바꿀 때만 `app.js`를 수정하고, 저장 필드 이름은 `Code.gs`의 `HEADERS`와 맞춥니다.
5. `apps-script` 폴더는 GitHub Pages 결과물에 포함되지 않습니다.

대시보드의 `보고 월`이 Google Sheets 조회와 월 누적의 기준입니다. `조회 기준일`은 특정 날짜의 입력값 확인과 보고서 기준일 표시에 사용합니다.

## 공개 링크와 권한

GitHub Pages는 화면을 공개하고, 실제 데이터는 Apps Script가 Google Sheets에 저장합니다.
현재 Apps Script가 `모든 사용자` 권한이면 링크를 아는 사람은 데이터를 읽고 쓸 수 있습니다.
조직 외부 공개나 사용자별 권한이 필요하면 정적 사이트만으로는 부족하며 인증 가능한 백엔드가 필요합니다.
